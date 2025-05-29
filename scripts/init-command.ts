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
		command: 'help',
		description: 'Show help information - lists all available commands',
	},
	{
		command: 'add',
		description: 'Add a new url - usage: /add [url] [optional:target_price]',
	},
	{
		command: 'delete',
		description: 'Delete a tracked url - usage: /delete [id]',
	},
	{
		command: 'myitems',
		description: 'List all tracked items with current prices and last checked time',
	},
	{
		command: 'edit',
		description: 'Update target price for an item - usage: /edit [id] [new_target_price]',
	},
]);
