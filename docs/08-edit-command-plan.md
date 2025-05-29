# Edit Command Implementation Plan

## Overview

Implement an `/edit` command to allow users to update the target price of tracked items.

## Implementation Steps

### 1. Edit Command Handler (`src/handlers/items.ts`)

```typescript
/**
 * Handles the /edit command - updates target price for an item
 */
export async function handleEditCommand(ctx: CommandContext<Context>, db: ReturnType<typeof drizzle>) {
	const userId = ctx.from?.id.toString();
	if (!userId) throw new BotError('Missing user ID', '❌ Unable to identify your account.');

	const [shortId, newTargetStr] = ctx.match.split(' ').filter(Boolean);
	const newTargetPrice = newTargetStr ? parseFloat(newTargetStr) : null;

	if (!shortId) {
		throw new BotError('Missing ID', 'Please provide item ID. Usage: /edit <item-id> <new-target-price>');
	}

	// Validate item exists and belongs to user
	const item = await db.select().from(items).where(eq(items.shortId, shortId)).get();
	if (!item) throw new BotError('Not found', '❌ Item not found');
	if (item.userId !== userId) throw new BotError('Permission denied', '❌ You can only edit your own items');

	// Update target price
	await db.update(items).set({ targetPrice: newTargetPrice }).where(eq(items.shortId, shortId));

	// Format response
	let response = `✅ Updated ${shortId} - ${truncate(item.title)}`;
	if (newTargetPrice) {
		response += `\nNew target: ${formatIDR(newTargetPrice)}`;
	} else {
		response += `\nTarget price removed`;
	}

	await ctx.reply(response);
}
```

### 2. Register Command (`src/index.ts`)

```typescript
// Add to command registrations
bot.command('edit', (ctx) => handleEditCommand(ctx, db));
```

### 3. Update Help Command (`src/handlers/user.ts`)

```typescript
// Update help text
const helpText = `
📚 *ThriftMind Bot Help*

*Available Commands:*
/start - Register your account
/add <url> [target_price] - Track a new product
/edit <item-id> <new_target_price> - Update target price
/myitems - List your tracked items
/delete <item-id> - Remove a tracked item
/help - Show this help message
`;
```

### 4. Update Bot Commands List (`scripts/init-command.ts`)

```typescript
await bot.api.setMyCommands([
	// ...existing commands
	{
		command: 'edit',
		description: 'Update target price for an item - usage: /edit [id] [new_target_price]',
	},
]);
```

### 5. Validation Logic

- Verify item exists and belongs to user
- Validate numeric target price
- Handle removal of target price (set to null)

## Next Steps

1. Implement code changes
2. Test functionality
3. Deploy updates
