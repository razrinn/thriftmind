import { CommandContext, Context } from 'grammy';
import { drizzle } from 'drizzle-orm/d1';
import { eq, count, desc } from 'drizzle-orm';
import { items, priceHistory, users } from '../db/schema';
import { scrapeTokopedia, isValidTokopediaUrl } from '../scrapers/tokopedia';
import { BotError } from './middleware';
import { generateShortId } from '../utils/idGenerator';

/**
 * Truncates text to max length with ellipsis if needed
 */
function truncate(text: string, maxLength = 36) {
	return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}

/**
 * Handles the /add command - adding new items to track
 */
export async function handleAddCommand(ctx: CommandContext<Context>, db: ReturnType<typeof drizzle>) {
	const userId = ctx.from?.id.toString();
	if (!userId) throw new BotError('Missing user ID', '❌ Unable to identify your account.');

	const [url, targetPriceStr] = ctx.match.split(' ').filter(Boolean);
	const targetPrice = targetPriceStr ? parseFloat(targetPriceStr) : undefined;

	if (!url) {
		throw new BotError('Missing URL', 'Please provide a product URL. Usage: /add <url> [target_price]');
	}

	if (!isValidTokopediaUrl(url)) {
		throw new BotError('Invalid URL', '❌ Invalid Tokopedia URL. Please provide a valid Tokopedia product link.');
	}

	// Check if user exists
	const user = await db.select().from(users).where(eq(users.id, userId)).get();
	if (!user) {
		throw new BotError('Unregistered user', 'Please use /start first to register your account.');
	}

	// Check item limit
	const itemCount = (await db.select({ count: count() }).from(items).where(eq(items.userId, userId)))[0].count;
	if (itemCount >= user.maxItems) {
		throw new BotError('Limit exceeded', `❌ You've reached your item limit (${user.maxItems}). Delete some items before adding more.`);
	}

	// Scrape product details
	const product = await scrapeTokopedia(url);

	// Insert new item
	const itemId = `item_${Date.now()}`;
	const shortId = generateShortId();
	await db.insert(items).values({
		id: itemId,
		shortId,
		url,
		title: product.title,
		currentPrice: product.price,
		targetPrice,
		lastChecked: new Date(),
		userId,
	});

	// Record initial price
	await db.insert(priceHistory).values({
		id: `ph_${Date.now()}`,
		itemId,
		price: product.price,
		recordedAt: new Date(),
	});

	// Send success message
	let reply = `✅ ${shortId} - ${truncate(product.title)} - Rp${product.price.toLocaleString('id-ID')}`;
	if (targetPrice) {
		reply += `\n(Target: Rp${targetPrice.toLocaleString('id-ID')})`;
	}

	await ctx.reply(reply);
}

/**
 * Handles the /myitems command - lists all tracked items for user
 */
export async function handleMyItemsCommand(ctx: CommandContext<Context>, db: ReturnType<typeof drizzle>) {
	const userId = ctx.from?.id.toString();
	if (!userId) throw new BotError('Missing user ID', '❌ Unable to identify your account.');

	const userItems = await db.select().from(items).where(eq(items.userId, userId)).all();

	if (userItems.length === 0) {
		await ctx.reply("You don't have any tracked items yet. Use /add to start tracking!");
		return;
	}

	// Get user's max item limit
	const user = await db.select().from(users).where(eq(users.id, userId)).get();
	const maxItems = user?.maxItems || 5; // Default to 5 if not set

	let message = `📋 Items (${userItems.length}/${maxItems}):`;
	for (const item of userItems) {
		// Get lowest and highest prices from history in a single batch
		const [lowestQuery, highestQuery] = await db.batch([
			db.select().from(priceHistory).where(eq(priceHistory.itemId, item.id)).orderBy(priceHistory.price).limit(1),
			db.select().from(priceHistory).where(eq(priceHistory.itemId, item.id)).orderBy(desc(priceHistory.price)).limit(1),
		]);

		const lowestPriceRecord = lowestQuery[0];
		const highestPriceRecord = highestQuery[0];

		message += `\n\n🆔 ${item.shortId} - ${truncate(item.title)}`;
		message += `\n🎯 Target: ${item.targetPrice ? `Rp${item.targetPrice.toLocaleString('id-ID')}` : 'None'}`;
		message += ` | 💰 Current: Rp${item.currentPrice.toLocaleString('id-ID')}`;

		if (lowestPriceRecord) {
			const priceDiff = item.currentPrice - lowestPriceRecord.price;
			if (priceDiff < 0) {
				message += ` | 📉 Low: Rp${lowestPriceRecord.price.toLocaleString('id-ID')} (${new Date(
					lowestPriceRecord.recordedAt
				).toLocaleDateString()})`;
			}
		}

		if (highestPriceRecord) {
			const priceDiff = item.currentPrice - highestPriceRecord.price;
			if (priceDiff > 0) {
				message += ` | 📈 High: Rp${highestPriceRecord.price.toLocaleString('id-ID')} (${new Date(
					highestPriceRecord.recordedAt
				).toLocaleDateString()})`;
			}
		}

		message += `\n🔄 Last checked: ${new Date(item.lastChecked).toLocaleDateString()}`;
	}

	await ctx.reply(message);
}

/**
 * Handles the /delete command - removes tracked items by short ID
 */
export async function handleDeleteCommand(ctx: CommandContext<Context>, db: ReturnType<typeof drizzle>) {
	const userId = ctx.from?.id.toString();
	if (!userId) throw new BotError('Missing user ID', '❌ Unable to identify your account.');

	const shortId = ctx.match.trim().toUpperCase(); // Case-insensitive matching
	if (!shortId) {
		throw new BotError('Missing ID', 'Please provide item ID. Usage: /delete <item-id>');
	}

	// First check if item exists and belongs to user
	const item = await db.select().from(items).where(eq(items.shortId, shortId)).get();

	if (!item) {
		throw new BotError('Not found', '❌ Item not found');
	}

	if (item.userId !== userId) {
		throw new BotError('Permission denied', '❌ You can only delete your own items');
	}

	// Delete the item (related records will be deleted automatically via ON DELETE CASCADE)
	await db.delete(items).where(eq(items.shortId, shortId));
	await ctx.reply(`✅ Deleted: ${truncate(item.title)}`);
}
