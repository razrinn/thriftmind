import { CommandContext, Context } from 'grammy';
import { drizzle } from 'drizzle-orm/d1';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema';
import { BotError } from './middleware';

/**
 * Handles the /start command - user registration
 */
export async function handleStartCommand(ctx: CommandContext<Context>, db: ReturnType<typeof drizzle>) {
	const userId = ctx.from?.id.toString();
	if (!userId) throw new BotError('Missing user ID', '❌ Unable to identify your account.');

	const user = await db.select().from(users).where(eq(users.id, userId)).get();

	if (user) {
		await ctx.reply(`Welcome back, ${user.firstName}! What do you want to track today?`);
	} else {
		await db.insert(users).values({
			id: userId,
			username: ctx.from?.username,
			firstName: ctx.from?.first_name ?? 'Unkown user',
			lastName: ctx.from?.last_name,
			createdAt: new Date(),
		});
		await ctx.reply('Welcome to ThriftMind! Use /help to see available commands.');
	}
}

/**
 * Handles the /help command - shows bot usage information
 */
export async function handleHelpCommand(ctx: CommandContext<Context>) {
	const helpText = `
📚 *ThriftMind Bot Help*

*Available Commands:*
/start - Register your account
/add <url> [target_price] - Track a new product
/edit <item-id> <new_target_price> - Update target price
/myitems - List your tracked items
/delete <item-id> - Remove a tracked item
/help - Show this help message

*Supported URLs:*
- Tokopedia
	- https://www.tokopedia.com/...
	- https://tk.tokopedia.com/...
- Others coming soon

*Current Limitations:*
- Price checks are performed periodically
- Maximum of 5 tracked items per user
- Doesn't include mobile-only discounts
`;

	await ctx.reply(helpText, { parse_mode: 'Markdown', link_preview_options: { is_disabled: true } });
}
