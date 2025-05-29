# Plan: Initialize User Data on /start Command

## Overview

Implement user initialization when new users send the `/start` command by:

1. Checking if user exists in database
2. Creating new user record if not found
3. Sending appropriate welcome messages

## Implementation Steps

### 1. Refactor Bot Initialization (src/index.ts)

```typescript
// Move bot creation outside webhook handler
const bot = new Bot(c.env.BOT_TOKEN, { botInfo: c.env.BOT_INFO });

// Add middleware to provide database access
bot.use(async (ctx, next) => {
	ctx.db = // initialize drizzle DB instance
		await next();
});

// Then register handlers...
```

### 2. Update /start Handler (src/index.ts)

```typescript
bot.command('start', async (ctx) => {
	const user = await ctx.db.query.users.findFirst({
		where: (users, { eq }) => eq(users.id, ctx.from.id.toString()),
	});

	if (user) {
		await ctx.reply(`Welcome back, ${user.firstName}!`);
	} else {
		// Create new user record
		await ctx.db.insert(users).values({
			id: ctx.from.id.toString(),
			username: ctx.from.username,
			firstName: ctx.from.first_name,
			lastName: ctx.from.last_name,
			createdAt: new Date(),
		});

		await ctx.reply('Welcome new user!');
	}
});
```

### 3. Database Operations

- Use Drizzle ORM for database access
- Convert Telegram user ID to string for primary key
- Handle timestamps with `new Date()`

### 4. Error Handling

```typescript
try {
	// database operations
} catch (error) {
	console.error('User init error:', error);
	await ctx.reply('Something went wrong. Please try again later.');
}
```

## Dependencies

- Requires database connection setup (to be implemented)
- Uses existing Drizzle schema (src/db/schema.ts)

## Testing Plan

1. Send /start from new user → should create record
2. Send /start from existing user → should not create duplicate
3. Test with missing user info (no username/last name)
