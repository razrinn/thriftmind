import { Bot, CommandContext, Context, webhookCallback } from 'grammy';
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { users, items, priceHistory } from './db/schema';
import { scrapeTokopedia, isValidTokopediaUrl, ScrapingError } from './scrapers/tokopedia';

class BotError extends Error {
	constructor(message: string, public userFriendlyMessage: string) {
		super(message);
		this.name = 'BotError';
	}
}

const app = new Hono<{ Bindings: Env }>();

/**
 * Middleware to handle common bot setup
 */
function setupBotMiddleware(bot: Bot) {
	// Error handling middleware
	bot.use(async (ctx, next) => {
		try {
			await next();
		} catch (error) {
			if (error instanceof BotError) {
				await ctx.reply(error.userFriendlyMessage);
			} else if (error instanceof Error) {
				if ('url' in error && typeof error.url === 'string') {
					console.error(`Scraping failed for ${error.url}:`, error.message);
					await ctx.reply('❌ Failed to process product page. Please try again later.');
				} else {
					console.error('Unexpected error:', error);
					await ctx.reply('❌ An unexpected error occurred. Please try again later.');
				}
			}
		}
	});
}

/**
 * Handles the /start command - user registration
 */
async function handleStartCommand(ctx: CommandContext<Context>, db: ReturnType<typeof drizzle>) {
	const userId = ctx.from?.id.toString();
	if (!userId) throw new BotError('Missing user ID', '❌ Unable to identify your account.');

	const user = await db.select().from(users).where(eq(users.id, userId)).get();

	if (user) {
		await ctx.reply(`Welcome back, ${user.firstName}! What do you want to track today?`);
	} else {
		await db.insert(users).values({
			id: userId,
			username: ctx.from?.username ?? null,
			firstName: ctx.from?.first_name ?? 'User',
			lastName: ctx.from?.last_name,
			createdAt: new Date(),
		});
		await ctx.reply('Welcome to ThriftMind! Use /help to see available commands.');
	}
}

/**
 * Handles the /add command - adding new items to track
 */
async function handleAddCommand(ctx: CommandContext<Context>, db: ReturnType<typeof drizzle>) {
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
	let reply =
		`✅ Successfully added tracking for:\n\n` + `📌 ${product.title}\n` + `💰 Current Price: Rp ${product.price.toLocaleString('id-ID')}`;

	if (targetPrice) {
		reply += `\n🎯 Target Price: Rp ${targetPrice.toLocaleString('id-ID')}`;
	}

	await ctx.reply(reply);
}

app
	.get('/', (c) => c.redirect('https://t.me/thriftmind_bot'))
	.use('/webhook', async (c, next) => {
		const rawBody = await c.req.text();
		if (!rawBody) return c.text('Empty request body', 400);

		try {
			c.req.parseBody = JSON.parse(rawBody);
			await next();
		} catch (error) {
			return c.text('Invalid JSON body', 400);
		}
	})
	.post('/webhook', (c) => {
		const bot = new Bot(c.env.BOT_TOKEN, { botInfo: c.env.BOT_INFO });

		const db = drizzle(c.env.DB);
		setupBotMiddleware(bot);
		bot.command('start', (ctx) => handleStartCommand(ctx, db));
		bot.command('add', (ctx) => handleAddCommand(ctx, db));

		return webhookCallback(bot, 'hono')(c);
	});

export default {
	fetch: app.fetch,
} satisfies ExportedHandler<Env>;
