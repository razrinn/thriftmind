import { and, asc, eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { items, priceHistory } from '../db/schema';
import { generateId } from '../utils/idGenerator';
import { scrapeTokopedia } from '../scrapers/tokopedia';

const BATCH_SIZE = 10;
const DELAY_MS = 1000; // 1 second delay between requests

export const scheduledHandler: ExportedHandlerScheduledHandler<Env> = async (controller, env, ctx) => {
	const db = drizzle(env.DB);

	try {
		// Get oldest unchecked items
		const itemsToProcess = await db.select().from(items).orderBy(asc(items.lastChecked)).limit(BATCH_SIZE);

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

				// TODO: add notification bot
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

			// Add delay between requests
			if (itemsToProcess.indexOf(item) < itemsToProcess.length - 1) {
				await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
			}
		}
	} catch (error) {
		console.error('Scheduled handler failed:', error);
		throw error;
	}
};
