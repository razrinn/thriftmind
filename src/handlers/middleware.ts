import { Bot } from 'grammy';

export class BotError extends Error {
	constructor(message: string, public userFriendlyMessage: string) {
		super(message);
		this.name = 'BotError';
	}
}

/**
 * Middleware to handle common bot setup
 */
export function setupBotMiddleware(bot: Bot) {
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
