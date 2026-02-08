export const SYSTEM_ROLES = ['admin', 'manager', 'member', 'viewer'] as const;
export type SystemRole = typeof SYSTEM_ROLES[number];

export const MODULES = ['core', 'crm', 'erp', 'agents', 'chat', 'email'] as const;
export type ModuleKey = typeof MODULES[number];

export const DEFAULT_MODULES: ModuleKey[] = ['core', 'crm'];

export const ENTITY_TYPES = {
  // CRM
  CRM_CONTACT: 'crm_contact',
  CRM_COMPANY: 'crm_company',
  CRM_DEAL: 'crm_deal',
  CRM_ACTIVITY: 'crm_activity',
  // ERP
  ERP_CLIENT: 'erp_client',
  ERP_INVENTORY: 'erp_inventory',
  ERP_ORDER: 'erp_order',
  ERP_INVOICE: 'erp_invoice',
  ERP_PAYMENT: 'erp_payment',
} as const;

export const AGENT_API_KEY_PREFIX = 'agk_';

export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '7d';
export const JWT_REFRESH_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const DEAL_STAGE_COLORS = [
  '#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6b7280',
] as const;

export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;
export const ORDER_STATUSES = ['draft', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
export const PAYMENT_METHODS = ['cash', 'bank_transfer', 'credit_card', 'check', 'other'] as const;

export const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;
