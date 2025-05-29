import { CommandContext, Context } from 'grammy';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { items, priceHistory, users } from '../db/schema';
import { scrapeTokopedia, isValidTokopediaUrl } from '../scrapers/tokopedia';
import { BotError } from './middleware';

/**
 * Truncates text to max length with ellipsis if needed
 */
function truncate(text: string, maxLength = 50) {
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

	// Scrape product details
	const product = await scrapeTokopedia(url);

	// Insert new item
	const itemId = `item_${Date.now()}`;
	await db.insert(items).values({
		id: itemId,
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
	let reply = `✅ ${truncate(product.title)} - Rp${product.price.toLocaleString('id-ID')}`;
	if (targetPrice) {
		reply += ` (Target: Rp${targetPrice.toLocaleString('id-ID')})`;
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

	let message = '📋 Your items:';
	for (const item of userItems) {
		message += `\n\n📌 ${truncate(item.title)}`;
		message += `\n💰 Rp${item.currentPrice.toLocaleString('id-ID')}`;
		if (item.targetPrice) {
			message += ` 🎯 Rp${item.targetPrice.toLocaleString('id-ID')}`;
		}
		message += `\n⏰ ${new Date(item.lastChecked).toLocaleTimeString()}`;
	}

	await ctx.reply(message);
}
