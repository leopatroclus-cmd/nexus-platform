import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { organizations, permissions } from './core';

// ─── Agents ───
export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  avatarUrl: text('avatar_url'),
  type: varchar('type', { length: 20 }).notNull().default('assistant'),
  status: varchar('status', { length: 20 }).notNull().default('active'),
  apiKeyHash: text('api_key_hash').notNull().unique(),
  config: jsonb('config').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('agents_org_idx').on(table.orgId),
]);

// ─── Agent Permissions ───
export const agentPermissions = pgTable('agent_permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  permissionId: uuid('permission_id').notNull().references(() => permissions.id, { onDelete: 'cascade' }),
}, (table) => [
  index('agent_permissions_agent_idx').on(table.agentId),
]);

// ─── Agent Tools ───
export const agentTools = pgTable('agent_tools', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  toolKey: varchar('tool_key', { length: 100 }).notNull(),
  config: jsonb('config').default({}),
}, (table) => [
  index('agent_tools_agent_idx').on(table.agentId),
]);

// ─── Agent Actions Log ───
export const agentActionsLog = pgTable('agent_actions_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  agentId: uuid('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }),
  entityId: uuid('entity_id'),
  input: jsonb('input'),
  output: jsonb('output'),
  status: varchar('status', { length: 20 }).notNull().default('success'),
  approvedBy: uuid('approved_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('agent_actions_org_idx').on(table.orgId),
  index('agent_actions_agent_idx').on(table.agentId),
]);
