import { integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
	id: text('id').primaryKey(), // Telegram user ID
	username: text('username').notNull(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name'),
	createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const items = sqliteTable(
	'items',
	{
		id: text('id').primaryKey(),
		url: text('url').notNull(),
		title: text('title').notNull(),
		currentPrice: real('current_price').notNull(),
		targetPrice: real('target_price'),
		lastChecked: integer('last_checked', { mode: 'timestamp_ms' }).notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => users.id),
	},
	(table) => [uniqueIndex('url_idx').on(table.url)]
);

export const priceHistory = sqliteTable('price_history', {
	id: text('id').primaryKey(),
	itemId: text('item_id')
		.notNull()
		.references(() => items.id),
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
		.references(() => items.id),
	oldPrice: real('old_price').notNull(),
	newPrice: real('new_price').notNull(),
	sentAt: integer('sent_at', { mode: 'timestamp_ms' }).notNull(),
});
