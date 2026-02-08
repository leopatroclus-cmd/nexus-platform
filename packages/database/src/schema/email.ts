import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { organizations } from './core';

// ─── Email Accounts ───
export const emailAccounts = pgTable('email_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  emailAddress: varchar('email_address', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 20 }).notNull(),
  credentials: jsonb('credentials'),
  syncStatus: varchar('sync_status', { length: 20 }).notNull().default('pending'),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  config: jsonb('config').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('email_accounts_org_idx').on(table.orgId),
]);

// ─── Emails ───
export const emails = pgTable('emails', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  emailAccountId: uuid('email_account_id').notNull().references(() => emailAccounts.id, { onDelete: 'cascade' }),
  messageId: varchar('message_id', { length: 255 }),
  threadId: varchar('thread_id', { length: 255 }),
  fromAddress: varchar('from_address', { length: 255 }).notNull(),
  toAddresses: text('to_addresses').array().default([]),
  cc: text('cc').array().default([]),
  subject: text('subject'),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  direction: varchar('direction', { length: 10 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('received'),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  receivedAt: timestamp('received_at', { withTimezone: true }),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('emails_org_idx').on(table.orgId),
  index('emails_account_idx').on(table.emailAccountId),
  index('emails_entity_idx').on(table.entityType, table.entityId),
]);

// ─── Email Attachments ───
export const emailAttachments = pgTable('email_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  emailId: uuid('email_id').notNull().references(() => emails.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  contentType: varchar('content_type', { length: 100 }),
  sizeBytes: integer('size_bytes'),
  storagePath: text('storage_path'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
