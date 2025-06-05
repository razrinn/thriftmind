import { Bot, Context, webhookCallback } from 'grammy';
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { setupBotMiddleware } from './handlers/middleware';
import { handleStartCommand, handleHelpCommand } from './handlers/user';
import { handleAddCommand, handleMyItemsCommand, handleDeleteCommand, handleEditCommand, handleChartCommand } from './handlers/items';
import { scheduledHandler } from './handlers/scheduled';

const app = new Hono<{ Bindings: Env }>();

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
		bot.command('myitems', (ctx) => handleMyItemsCommand(ctx, db));
		bot.command('delete', (ctx) => handleDeleteCommand(ctx, db));
		bot.command('edit', (ctx) => handleEditCommand(ctx, db));
		bot.command('chart', (ctx) => handleChartCommand(ctx, db));
		bot.command('help', (ctx) => handleHelpCommand(ctx));

		return webhookCallback(bot, 'hono')(c);
	});

export default {
	fetch: app.fetch,
	scheduled: scheduledHandler,
} satisfies ExportedHandler<Env>;
