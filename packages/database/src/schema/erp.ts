import { pgTable, uuid, varchar, text, boolean, timestamp, jsonb, integer, numeric, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { organizations } from './core';
import { crmCompanies, crmContacts } from './crm';

// ─── ERP Pricelists ───
export const erpPricelists = pgTable('erp_pricelists', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('erp_pricelists_org_idx').on(table.orgId),
  uniqueIndex('erp_pricelists_org_name_idx').on(table.orgId, table.name),
]);

// ─── ERP Clients ───
export const erpClients = pgTable('erp_clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull().default('customer'),
  taxId: varchar('tax_id', { length: 50 }),
  billingAddress: jsonb('billing_address'),
  shippingAddress: jsonb('shipping_address'),
  paymentTerms: varchar('payment_terms', { length: 50 }),
  creditLimit: numeric('credit_limit', { precision: 15, scale: 2 }),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  pricelistId: uuid('pricelist_id').references(() => erpPricelists.id, { onDelete: 'set null' }),
  crmCompanyId: uuid('crm_company_id').references(() => crmCompanies.id, { onDelete: 'set null' }),
  crmContactId: uuid('crm_contact_id').references(() => crmContacts.id, { onDelete: 'set null' }),
  openingBalance: numeric('opening_balance', { precision: 15, scale: 2 }).notNull().default('0'),
  openingBalanceDate: timestamp('opening_balance_date', { withTimezone: true }),
  accountBalance: numeric('account_balance', { precision: 15, scale: 2 }).notNull().default('0'),
  customData: jsonb('custom_data').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('erp_clients_org_idx').on(table.orgId),
]);

// ─── ERP Inventory ───
export const erpInventory = pgTable('erp_inventory', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 50 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull().default('product'),
  unit: varchar('unit', { length: 20 }).notNull().default('unit'),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull().default('0'),
  costPrice: numeric('cost_price', { precision: 15, scale: 2 }).notNull().default('0'),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  quantityOnHand: integer('quantity_on_hand').notNull().default(0),
  reorderLevel: integer('reorder_level').notNull().default(0),
  customData: jsonb('custom_data').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('erp_inventory_org_idx').on(table.orgId),
  uniqueIndex('erp_inventory_org_sku_idx').on(table.orgId, table.sku),
]);

// ─── ERP Pricelist Items ───
export const erpPricelistItems = pgTable('erp_pricelist_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  pricelistId: uuid('pricelist_id').notNull().references(() => erpPricelists.id, { onDelete: 'cascade' }),
  inventoryId: uuid('inventory_id').notNull().references(() => erpInventory.id, { onDelete: 'cascade' }),
  price: numeric('price', { precision: 15, scale: 2 }).notNull(),
  minQuantity: numeric('min_quantity', { precision: 15, scale: 4 }).notNull().default('1'),
}, (table) => [
  uniqueIndex('erp_pricelist_items_list_inv_idx').on(table.pricelistId, table.inventoryId),
]);

// ─── ERP Orders ───
export const erpOrders = pgTable('erp_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  type: varchar('type', { length: 20 }).notNull().default('sales'),
  status: varchar('status', { length: 50 }).notNull().default('draft'),
  clientId: uuid('client_id').notNull().references(() => erpClients.id),
  orderDate: timestamp('order_date', { withTimezone: true }).notNull(),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull().default('0'),
  tax: numeric('tax', { precision: 15, scale: 2 }).notNull().default('0'),
  discount: numeric('discount', { precision: 15, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 15, scale: 2 }).notNull().default('0'),
  customData: jsonb('custom_data').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('erp_orders_org_idx').on(table.orgId),
  uniqueIndex('erp_orders_org_number_idx').on(table.orgId, table.orderNumber),
]);

// ─── ERP Order Items ───
export const erpOrderItems = pgTable('erp_order_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => erpOrders.id, { onDelete: 'cascade' }),
  inventoryId: uuid('inventory_id').references(() => erpInventory.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  discountPct: numeric('discount_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  lineTotal: numeric('line_total', { precision: 15, scale: 2 }).notNull(),
});

// ─── ERP Invoices ───
export const erpInvoices = pgTable('erp_invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
  type: varchar('type', { length: 20 }).notNull().default('invoice'),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  clientId: uuid('client_id').notNull().references(() => erpClients.id),
  orderId: uuid('order_id').references(() => erpOrders.id, { onDelete: 'set null' }),
  issueDate: timestamp('issue_date', { withTimezone: true }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
  subtotal: numeric('subtotal', { precision: 15, scale: 2 }).notNull().default('0'),
  tax: numeric('tax', { precision: 15, scale: 2 }).notNull().default('0'),
  discount: numeric('discount', { precision: 15, scale: 2 }).notNull().default('0'),
  total: numeric('total', { precision: 15, scale: 2 }).notNull().default('0'),
  amountPaid: numeric('amount_paid', { precision: 15, scale: 2 }).notNull().default('0'),
  balanceDue: numeric('balance_due', { precision: 15, scale: 2 }).notNull().default('0'),
  originalInvoiceId: uuid('original_invoice_id').references((): any => erpInvoices.id, { onDelete: 'set null' }),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  customData: jsonb('custom_data').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('erp_invoices_org_idx').on(table.orgId),
  uniqueIndex('erp_invoices_org_number_idx').on(table.orgId, table.invoiceNumber),
]);

// ─── ERP Invoice Items ───
export const erpInvoiceItems = pgTable('erp_invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').notNull().references(() => erpInvoices.id, { onDelete: 'cascade' }),
  inventoryId: uuid('inventory_id').references(() => erpInventory.id, { onDelete: 'set null' }),
  description: text('description').notNull(),
  quantity: numeric('quantity', { precision: 15, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 15, scale: 2 }).notNull(),
  discountPct: numeric('discount_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  taxRate: numeric('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  lineTotal: numeric('line_total', { precision: 15, scale: 2 }).notNull(),
});

// ─── ERP Payments ───
export const erpPayments = pgTable('erp_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  paymentNumber: varchar('payment_number', { length: 50 }).notNull(),
  clientId: uuid('client_id').notNull().references(() => erpClients.id),
  invoiceId: uuid('invoice_id').references(() => erpInvoices.id, { onDelete: 'set null' }),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  paymentDate: timestamp('payment_date', { withTimezone: true }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('completed'),
  customData: jsonb('custom_data').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('erp_payments_org_idx').on(table.orgId),
  uniqueIndex('erp_payments_org_number_idx').on(table.orgId, table.paymentNumber),
]);

// ─── ERP Ledger Entries (double-entry) ───
export const erpLedgerEntries = pgTable('erp_ledger_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  transactionId: uuid('transaction_id').notNull(),
  accountCode: varchar('account_code', { length: 20 }).notNull(),
  entryType: varchar('entry_type', { length: 10 }).notNull(),
  amount: numeric('amount', { precision: 15, scale: 2 }).notNull(),
  description: text('description'),
  sourceType: varchar('source_type', { length: 50 }),
  sourceId: uuid('source_id'),
  entryDate: timestamp('entry_date', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('erp_ledger_org_idx').on(table.orgId),
  index('erp_ledger_transaction_idx').on(table.transactionId),
  index('erp_ledger_account_idx').on(table.orgId, table.accountCode),
]);

// ─── ERP Chart of Accounts ───
export const erpChartOfAccounts = pgTable('erp_chart_of_accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 20 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  parentCode: varchar('parent_code', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('erp_coa_org_code_idx').on(table.orgId, table.code),
]);
