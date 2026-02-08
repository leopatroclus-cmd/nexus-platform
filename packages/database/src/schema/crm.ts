import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, integer, numeric, index } from 'drizzle-orm/pg-core';
import { organizations, users } from './core';

// ─── CRM Companies ───
export const crmCompanies = pgTable('crm_companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  domain: varchar('domain', { length: 255 }),
  industry: varchar('industry', { length: 100 }),
  size: varchar('size', { length: 50 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: jsonb('address'),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  customData: jsonb('custom_data').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('crm_companies_org_idx').on(table.orgId),
  index('crm_companies_name_idx').on(table.orgId, table.name),
]);

// ─── CRM Contacts ───
export const crmContacts = pgTable('crm_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  jobTitle: varchar('job_title', { length: 100 }),
  companyId: uuid('company_id').references(() => crmCompanies.id, { onDelete: 'set null' }),
  source: varchar('source', { length: 50 }),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  tags: text('tags').array().default([]),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  customData: jsonb('custom_data').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('crm_contacts_org_idx').on(table.orgId),
  index('crm_contacts_email_idx').on(table.orgId, table.email),
  index('crm_contacts_company_idx').on(table.companyId),
]);

// ─── CRM Deal Stages ───
export const crmDealStages = pgTable('crm_deal_stages', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  pipelineName: varchar('pipeline_name', { length: 100 }).notNull().default('Default'),
  name: varchar('name', { length: 100 }).notNull(),
  displayOrder: integer('display_order').notNull().default(0),
  probability: integer('probability').notNull().default(0),
  isWon: boolean('is_won').notNull().default(false),
  isLost: boolean('is_lost').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('crm_deal_stages_org_idx').on(table.orgId),
]);

// ─── CRM Deals ───
export const crmDeals = pgTable('crm_deals', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  value: numeric('value', { precision: 15, scale: 2 }),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  stageId: uuid('stage_id').notNull().references(() => crmDealStages.id),
  contactId: uuid('contact_id').references(() => crmContacts.id, { onDelete: 'set null' }),
  companyId: uuid('company_id').references(() => crmCompanies.id, { onDelete: 'set null' }),
  expectedClose: timestamp('expected_close', { withTimezone: true }),
  ownerId: uuid('owner_id').references(() => users.id, { onDelete: 'set null' }),
  customData: jsonb('custom_data').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('crm_deals_org_idx').on(table.orgId),
  index('crm_deals_stage_idx').on(table.stageId),
  index('crm_deals_contact_idx').on(table.contactId),
]);

// ─── CRM Activities ───
export const crmActivities = pgTable('crm_activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  priority: varchar('priority', { length: 50 }).notNull().default('medium'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  relatedType: varchar('related_type', { length: 50 }),
  relatedId: uuid('related_id'),
  assignedTo: uuid('assigned_to').references(() => users.id, { onDelete: 'set null' }),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  customData: jsonb('custom_data').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('crm_activities_org_idx').on(table.orgId),
  index('crm_activities_related_idx').on(table.relatedType, table.relatedId),
]);

// ─── CRM Notes ───
export const crmNotes = pgTable('crm_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  relatedType: varchar('related_type', { length: 50 }).notNull(),
  relatedId: uuid('related_id').notNull(),
  isPinned: boolean('is_pinned').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('crm_notes_org_idx').on(table.orgId),
  index('crm_notes_related_idx').on(table.relatedType, table.relatedId),
]);
