import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(), // Telegram user ID
	username: text('username'),
	firstName: text('first_name').notNull(),
	lastName: text('last_name'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
	maxItems: integer('max_items').notNull().default(5),
});

export const items = sqliteTable(
	'items',
	{
		id: text('id').primaryKey(),
		shortId: text('short_id').notNull().unique(),
		url: text('url').notNull(),
		title: text('title').notNull(),
		currentPrice: real('current_price').notNull(),
		targetPrice: real('target_price'),
		lastChecked: integer('last_checked', { mode: 'timestamp_ms' }).notNull(),
		errorCount: integer('error_count').default(0),
		lastError: text('last_error'),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
	},
	(table) => [index('items_user_id_idx').on(table.userId)]
);

export const priceHistory = sqliteTable('price_history', {
	id: text('id').primaryKey(),
	itemId: text('item_id')
		.notNull()
		.references(() => items.id, { onDelete: 'cascade' }),
	price: real('price').notNull(),
	recordedAt: integer('recorded_at', { mode: 'timestamp_ms' }).notNull(),
});

export const notifications = sqliteTable('notifications', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => users.id),
	itemId: text('item_id')
		.notNull()
		.references(() => items.id, { onDelete: 'cascade' }),
	oldPrice: real('old_price').notNull(),
	newPrice: real('new_price').notNull(),
	sentAt: integer('sent_at', { mode: 'timestamp_ms' }).notNull(),
});
