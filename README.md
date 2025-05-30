# ThriftMind

A Cloudflare Worker application for managing items with Drizzle ORM.

## Features

- Item management API
- User authentication
- Scheduled processing
- Tokopedia scraping integration

## How to Use the Bot

The ThriftMind bot provides these commands:

- `/start` - Initialize the bot and get started
- `/add [item]` - Add a new item to your list
- `/list` - View all your items
- `/delete [id]` - Remove an item by ID
- `/edit [id] [new_value]` - Modify an existing item
- `/help` - Show available commands

To interact with the bot, simply send these commands in your Telegram chat.

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure environment variables in `dev.vars` & `wrangler.jsonc` file:

- BOT_TOKEN: Telegram bot token
- BOT_INFO: Telegram bot info

3. Run development server:

```bash
pnpm dev
```

## Deployment

```bash
pnpm run deploy
```

## Tech Stack

- Cloudflare Workers
- Drizzle ORM
- TypeScript
