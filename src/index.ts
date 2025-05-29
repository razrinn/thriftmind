import { Bot, webhookCallback } from 'grammy';
import { Hono } from 'hono';

const app = new Hono<{ Bindings: Env }>();

app
	.get('/', (c) => {
		return c.redirect('https://t.me/thriftmind_bot');
	})
	.use('/webhook', async (c, next) => {
		const rawBody = await c.req.text();

		if (!rawBody) {
			return c.text('Empty request body', 400);
		}

		try {
			c.req.parseBody = JSON.parse(rawBody); // Optional if JSON parsing is needed
		} catch (error) {
			return c.text('Invalid JSON body', 400);
		}

		await next();
	})
	.post('/webhook', (c) => {
		const bot = new Bot(c.env.BOT_TOKEN, { botInfo: c.env.BOT_INFO });

		bot.command('start', async (ctx) => {
			await ctx.reply('Hello, world!');
		});

		return webhookCallback(bot, 'hono')(c);
	});

export default {
	fetch: app.fetch,

	// async scheduled(event, env, ctx): Promise<void> {
	// 	let resp = await fetch('https://api.cloudflare.com/client/v4/ips');
	// 	let wasSuccessful = resp.ok ? 'success' : 'fail';

	// 	console.log(`trigger fired at ${event.cron}: ${wasSuccessful}`);
	// },
} satisfies ExportedHandler<Env>;
