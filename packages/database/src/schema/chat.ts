import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { organizations } from './core';

// ─── Conversations ───
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }),
  type: varchar('type', { length: 30 }).notNull().default('general'),
  status: varchar('status', { length: 20 }).notNull().default('open'),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  createdBy: uuid('created_by').notNull(),
  lastMessageAt: timestamp('last_message_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('conversations_org_idx').on(table.orgId),
  index('conversations_entity_idx').on(table.entityType, table.entityId),
]);

// ─── Conversation Participants ───
export const conversationParticipants = pgTable('conversation_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  participantType: varchar('participant_type', { length: 10 }).notNull(),
  participantId: uuid('participant_id').notNull(),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('conv_participants_conv_idx').on(table.conversationId),
]);

// ─── Messages ───
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderType: varchar('sender_type', { length: 10 }).notNull(),
  senderId: uuid('sender_id').notNull(),
  content: text('content').notNull(),
  contentType: varchar('content_type', { length: 20 }).notNull().default('text'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('messages_org_idx').on(table.orgId),
  index('messages_conv_idx').on(table.conversationId),
]);
