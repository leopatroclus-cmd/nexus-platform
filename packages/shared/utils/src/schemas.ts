import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  orgName: z.string().min(1).max(255),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  orgId: z.string().uuid().optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const switchOrgSchema = z.object({
  orgId: z.string().uuid(),
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  sort: z.string().optional(),
  search: z.string().optional(),
});

export const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

export const orgIdParamSchema = z.object({
  orgId: z.string().uuid(),
});

// CRM Schemas
export const crmCompanySchema = z.object({
  name: z.string().min(1).max(255),
  domain: z.string().max(255).optional(),
  industry: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email().optional(),
  address: z.record(z.string()).optional(),
  ownerId: z.string().uuid().optional(),
  customData: z.record(z.unknown()).optional(),
});

export const crmContactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  jobTitle: z.string().max(100).optional(),
  companyId: z.string().uuid().optional(),
  source: z.string().max(50).optional(),
  status: z.string().max(50).default('active'),
  tags: z.array(z.string()).default([]),
  customData: z.record(z.unknown()).optional(),
});

export const crmDealStageSchema = z.object({
  pipelineName: z.string().min(1).max(100).default('Default'),
  name: z.string().min(1).max(100),
  displayOrder: z.number().int().min(0),
  probability: z.number().min(0).max(100).default(0),
  isWon: z.boolean().default(false),
  isLost: z.boolean().default(false),
});

export const crmDealSchema = z.object({
  title: z.string().min(1).max(255),
  value: z.number().min(0).optional(),
  currency: z.string().length(3).default('USD'),
  stageId: z.string().uuid(),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  expectedClose: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  customData: z.record(z.unknown()).optional(),
});

export const crmActivitySchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'task']),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  status: z.string().max(50).default('pending'),
  priority: z.string().max(50).default('medium'),
  dueDate: z.string().optional(),
  relatedType: z.string().optional(),
  relatedId: z.string().uuid().optional(),
  customData: z.record(z.unknown()).optional(),
});

export const crmNoteSchema = z.object({
  content: z.string().min(1),
  relatedType: z.string().min(1),
  relatedId: z.string().uuid(),
  isPinned: z.boolean().default(false),
});

// ERP Schemas
export const erpClientSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['customer', 'vendor', 'both']),
  taxId: z.string().max(50).optional(),
  billingAddress: z.record(z.string()).optional(),
  shippingAddress: z.record(z.string()).optional(),
  paymentTerms: z.string().max(50).optional(),
  creditLimit: z.number().min(0).optional(),
  currency: z.string().length(3).default('USD'),
  crmCompanyId: z.string().uuid().optional(),
  crmContactId: z.string().uuid().optional(),
  customData: z.record(z.unknown()).optional(),
});

export const erpInventorySchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(255),
  type: z.enum(['product', 'service']),
  unit: z.string().max(20).default('unit'),
  unitPrice: z.number().min(0),
  costPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(0),
  quantityOnHand: z.number().int().min(0).default(0),
  reorderLevel: z.number().int().min(0).default(0),
  customData: z.record(z.unknown()).optional(),
});

export const erpOrderItemSchema = z.object({
  inventoryId: z.string().uuid().optional(),
  description: z.string().min(1),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
  discountPct: z.number().min(0).max(100).default(0),
  taxRate: z.number().min(0).max(100).default(0),
});

export const erpOrderSchema = z.object({
  type: z.enum(['sales', 'purchase']),
  status: z.string().max(50).default('draft'),
  clientId: z.string().uuid(),
  orderDate: z.string(),
  items: z.array(erpOrderItemSchema).min(1),
  discount: z.number().min(0).default(0),
  customData: z.record(z.unknown()).optional(),
});

export const erpInvoiceItemSchema = z.object({
  inventoryId: z.string().uuid().optional(),
  description: z.string().min(1),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
  discountPct: z.number().min(0).max(100).default(0),
  taxRate: z.number().min(0).max(100).default(0),
});

export const erpInvoiceSchema = z.object({
  type: z.enum(['invoice', 'credit_note']).default('invoice'),
  clientId: z.string().uuid(),
  orderId: z.string().uuid().optional(),
  issueDate: z.string(),
  dueDate: z.string(),
  items: z.array(erpInvoiceItemSchema).min(1),
  discount: z.number().min(0).default(0),
  originalInvoiceId: z.string().uuid().optional(),
  customData: z.record(z.unknown()).optional(),
});

export const erpPaymentSchema = z.object({
  clientId: z.string().uuid(),
  invoiceId: z.string().uuid().optional(),
  amount: z.number().min(0.01),
  paymentDate: z.string(),
  paymentMethod: z.string().min(1).max(50),
  status: z.string().max(50).default('completed'),
});

export const erpChartOfAccountsSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  type: z.enum(['asset', 'liability', 'equity', 'revenue', 'expense']),
  parentCode: z.string().max(20).optional(),
});

// Custom Fields Schemas
export const customFieldCreateSchema = z.object({
  entityType: z.string().min(1),
  fieldKey: z.string().min(1).max(50).regex(/^[a-z][a-z0-9_]*$/),
  fieldLabel: z.string().min(1).max(100),
  fieldType: z.enum(['text', 'number', 'date', 'boolean', 'select', 'multiselect', 'email', 'url', 'currency']),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    color: z.string().optional(),
  })).optional(),
  isRequired: z.boolean().default(false),
  isFilterable: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  defaultValue: z.unknown().optional(),
});

export const customFieldUpdateSchema = z.object({
  fieldLabel: z.string().min(1).max(100).optional(),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
    color: z.string().optional(),
  })).optional(),
  isRequired: z.boolean().optional(),
  isFilterable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  defaultValue: z.unknown().optional(),
});

// Agent Schemas
export const agentCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: z.enum(['assistant', 'automation']),
  config: z.record(z.unknown()).default({}),
});

export const agentUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  status: z.enum(['active', 'paused', 'disabled']).optional(),
  config: z.record(z.unknown()).optional(),
});

// Chat Schemas
export const conversationCreateSchema = z.object({
  title: z.string().max(255).optional(),
  type: z.enum(['entity_thread', 'general', 'agent_initiated']).default('general'),
  entityType: z.string().optional(),
  entityId: z.string().uuid().optional(),
});

export const messageCreateSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1),
  contentType: z.enum(['text', 'action_request', 'action_result', 'email_preview']).default('text'),
  metadata: z.record(z.unknown()).optional(),
});
