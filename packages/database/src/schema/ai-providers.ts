import { pgTable, uuid, varchar, text, boolean, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { organizations } from './core';

// ─── AI Provider Keys ───
export const aiProviderKeys = pgTable('ai_provider_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 20 }).notNull(), // anthropic | openai | google
  encryptedKey: text('encrypted_key').notNull(),
  iv: text('iv').notNull(),
  label: varchar('label', { length: 100 }).notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('ai_provider_keys_org_provider_label_idx').on(table.orgId, table.provider, table.label),
  index('ai_provider_keys_org_idx').on(table.orgId),
]);
