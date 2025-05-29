# Item Limit Implementation Plan

## Objective

Add a `maxItems` column to the users table to limit the number of items a user can create. The default limit is 5.

## Steps

### 1. Add `maxItems` Column to Users Table

- File: `src/db/schema.ts`
- Modify the `users` table definition to include:
  ```typescript
  maxItems: integer('max_items').notNull().default(5);
  ```

### 2. Update User Creation Logic

- File: `src/handlers/user.ts`
- No changes required because Drizzle ORM will automatically set the default value for new users.

### 3. Migrate Existing Users

- Create a migration script: `scripts/migrate-user-limits.ts`

  ```typescript
  import { drizzle } from 'drizzle-orm/d1';
  import { users } from '../src/db/schema';
  import { getD1Binding } from '../worker-configuration';
  import { eq } from 'drizzle-orm';

  const d1 = getD1Binding();
  const db = drizzle(d1);

  async function migrate() {
  	await db.update(users).set({ maxItems: 5 }).where(eq(users.maxItems, null));
  	console.log('Migration complete: Set default item limits for existing users');
  }

  migrate().catch(console.error);
  ```

### 4. Enforce Limit in Item Creation

- File: `src/handlers/items.ts`
- In the `handleAddCommand` function, after fetching the user, add:

  ```typescript
  // Check item limit
  const itemCount = await db.select().from(items).where(eq(items.userId, userId)).all().length;

  if (itemCount >= user.maxItems) {
  	throw new BotError('Limit exceeded', `❌ You've reached your item limit (${user.maxItems}). Delete some items before adding more.`);
  }
  ```

### 5. Update Help Command

- File: `src/handlers/user.ts`
- In the `handleHelpCommand` function, update the help text to reflect the new limit:
  ```typescript
  // Change the line about limitations to:
  - Maximum of 5 tracked items per user
  ```

## Migration Execution Plan

1. Deploy the schema changes to the database
2. Run the migration script: `npx tsx scripts/migrate-user-limits.ts`
3. Deploy the updated handlers (items.ts and user.ts)

## Open Questions

1. Should we add a way for users to increase their limit (e.g., premium feature)?
2. Do you want to include the current item count in the `/myitems` command?
3. Should we notify users when they're approaching their limit?
