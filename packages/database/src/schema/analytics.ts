import { pgTable, uuid, text, jsonb, integer, timestamp, varchar, index } from 'drizzle-orm/pg-core';
import { organizations, users } from './core';

// ─── Pinned Charts ───
export const pinnedCharts = pgTable('pinned_charts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  toolName: varchar('tool_name', { length: 100 }).notNull(),
  toolArgs: jsonb('tool_args').default({}),
  resultData: jsonb('result_data').default({}),
  chartType: varchar('chart_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('pinned_charts_org_user_idx').on(table.orgId, table.userId),
]);
