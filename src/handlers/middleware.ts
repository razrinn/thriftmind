import { Bot } from 'grammy';
import { Context } from 'hono';
import { WHITELISTED_USERNAME } from '../utils/whitelist';

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
			if (!ctx.from?.username) {
				throw new BotError('Missing username', '❌ Set your Telegram username.');
			}

			if (!WHITELISTED_USERNAME.includes(ctx.from.username)) {
				throw new BotError('Unauthorized access attempt', '⛔ Sorry, you are not authorized to use this bot');
			}

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
