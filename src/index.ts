import { Bot, webhookCallback } from 'grammy';
import { Hono } from 'hono';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { users } from './db/schema';

declare module 'grammy' {
	interface Context {
		db: ReturnType<typeof drizzle>;
	}
}

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
			c.req.parseBody = JSON.parse(rawBody);
		} catch (error) {
			return c.text('Invalid JSON body', 400);
		}

		await next();
	})
	.post('/webhook', (c) => {
		const bot = new Bot(c.env.BOT_TOKEN, { botInfo: c.env.BOT_INFO });

		bot.use(async (ctx, next) => {
			ctx.db = drizzle(c.env.DB);
			await next();
		});

		bot.command('start', async (ctx) => {
			try {
				const userId = ctx.from?.id.toString();
				if (!userId) throw new Error('Missing user ID');

				const user = await ctx.db.select().from(users).where(eq(users.id, userId)).get();

				if (user) {
					await ctx.reply(`Welcome back, ${user.firstName}!`);
				} else {
					await ctx.db.insert(users).values({
						id: userId,
						username: ctx.from?.username ?? null,
						firstName: ctx.from?.first_name ?? 'User',
						lastName: ctx.from?.last_name,
						createdAt: new Date(),
					});
					await ctx.reply('Welcome to ThriftMind! Use /help to see available commands.');
				}
			} catch (error) {
				console.error('Start command error:', error);
				await ctx.reply('Something went wrong. Please try again later.');
			}
		});

		return webhookCallback(bot, 'hono')(c);
	});

export default {
	fetch: app.fetch,
} satisfies ExportedHandler<Env>;
