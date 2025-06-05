import { and, asc, eq, lt, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { items, priceHistory } from '../db/schema';
import { generateId, truncate } from '../utils/idGenerator';
import { formatIDR } from '../utils/priceFormatter';
import { scrapeTokopedia } from '../scrapers/tokopedia';
import { Bot } from 'grammy';

const BATCH_SIZE = 10;

export const scheduledHandler: ExportedHandlerScheduledHandler<Env> = async (controller, env, ctx) => {
	const db = drizzle(env.DB);
	const bot = new Bot(env.BOT_TOKEN, { botInfo: env.BOT_INFO });

	try {
		const now = new Date();
		const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
		const itemsToProcess = await db
			.select()
			.from(items)
			.where(lt(items.lastChecked, startOfDay))
			.orderBy(asc(items.lastChecked))
			.limit(BATCH_SIZE);

		if (itemsToProcess.length === 0) {
			return;
		}

		// Process items sequentially with delay
		for (const item of itemsToProcess) {
			try {
				const scraped = await scrapeTokopedia(item.url);
				const now = new Date();

				// Update item price and last checked time
				await db
					.update(items)
					.set({
						currentPrice: scraped.price,
						lastChecked: now,
						errorCount: 0, // Reset error count on success
					})
					.where(eq(items.id, item.id));

				// Record price history
				await db.insert(priceHistory).values({
					id: generateId(),
					itemId: item.id,
					price: scraped.price,
					recordedAt: now,
				});

				// Check price conditions for notifications
				const priceHistoryRecords = await db
					.select()
					.from(priceHistory)
					.where(eq(priceHistory.itemId, item.id));

				// Get historical min price
				const historicalMin = priceHistoryRecords.length > 0
					? Math.min(...priceHistoryRecords.map(r => r.price))
					: Infinity;

				let message = '';
				if (item.targetPrice && scraped.price <= item.targetPrice) {
					message = `✅ Price alert! ${truncate(item.title)}: ${formatIDR(scraped.price)} (target: ${formatIDR(item.targetPrice)})`;
				} else if (scraped.price < historicalMin) {
					message = `📉 Lowest price ever! ${truncate(item.title)}: ${formatIDR(scraped.price)}`;
				} else if (scraped.price < item.currentPrice) {
					message = `🔽 Price dropped! ${truncate(item.title)}: ${formatIDR(scraped.price)} (was ${formatIDR(item.currentPrice)})`;
				}
				if (message) {
					try {
						await bot.api.sendMessage(item.userId, message);
					} catch (error) {
						console.error(`Failed to send notification for item ${item.id}:`, error);
					}
				}
			} catch (error) {
				console.error(`Failed to process item ${item.id}:`, error);
				await db
					.update(items)
					.set({
						errorCount: sql`${items.errorCount} + 1`,
						lastError: error instanceof Error ? error.message : String(error),
					})
					.where(eq(items.id, item.id));
			}
		}
	} catch (error) {
		console.error('Scheduled handler failed:', error);
		throw error;
	}
};
