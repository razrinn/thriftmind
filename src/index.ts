import { Bot, Context, webhookCallback } from "grammy";


export default {
	async fetch(req, env, ctx) {
    const bot = new Bot(env.BOT_TOKEN, { botInfo: env.BOT_INFO});


    bot.command("start", async (ctx: Context) => {
      await ctx.reply("Hello, world!");
    });

    return webhookCallback(bot, "cloudflare-mod")(req);
	},


	// async scheduled(event, env, ctx): Promise<void> {
	// 	let resp = await fetch('https://api.cloudflare.com/client/v4/ips');
	// 	let wasSuccessful = resp.ok ? 'success' : 'fail';

	// 	console.log(`trigger fired at ${event.cron}: ${wasSuccessful}`);
	// },
} satisfies ExportedHandler<Env>;
