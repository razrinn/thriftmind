import { Bot } from 'grammy';

const bot = new Bot(process.env.BOT_TOKEN!, {
	botInfo: {
		id: 8158796886,
		is_bot: true,
		first_name: 'ThriftMind',
		username: 'thriftmind_bot',
		can_join_groups: true,
		can_read_all_group_messages: false,
		supports_inline_queries: false,
		can_connect_to_business: false,
		has_main_web_app: false,
	},
});

await bot.api.setMyCommands([
	{
		command: 'start',
		description: 'Start using the bot - sends welcome message and instructions',
	},
	{
		command: 'add',
		description: 'Add a new item - usage: /add [item_name] [optional:target_price]',
	},
	{
		command: 'help',
		description: 'Show help information - lists all available commands',
	},
	{
		command: 'list',
		description: 'List all items - shows your saved items with details',
	},
]);
