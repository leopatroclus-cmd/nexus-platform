export interface BaseEntity {
  id: string;
  orgId: string;
  customData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// CRM Entities
export interface CrmCompany extends BaseEntity {
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  phone?: string;
  email?: string;
  address?: Record<string, string>;
  ownerId?: string;
}

export interface CrmContact extends BaseEntity {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  companyId?: string;
  source?: string;
  status: string;
  tags: string[];
}

export interface CrmDealStage extends BaseEntity {
  pipelineName: string;
  name: string;
  displayOrder: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
}

export interface CrmDeal extends BaseEntity {
  title: string;
  value?: number;
  currency: string;
  stageId: string;
  contactId?: string;
  companyId?: string;
  expectedClose?: string;
  ownerId?: string;
}

export interface CrmActivity extends BaseEntity {
  type: 'call' | 'email' | 'meeting' | 'task';
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: string;
  relatedType?: string;
  relatedId?: string;
}

export interface CrmNote extends BaseEntity {
  content: string;
  relatedType: string;
  relatedId: string;
  isPinned: boolean;
}

// ERP Entities
export interface ErpClient extends BaseEntity {
  name: string;
  type: 'customer' | 'vendor' | 'both';
  taxId?: string;
  billingAddress?: Record<string, string>;
  shippingAddress?: Record<string, string>;
  paymentTerms?: string;
  creditLimit?: number;
  currency: string;
  crmCompanyId?: string;
  crmContactId?: string;
}

export interface ErpInventory extends BaseEntity {
  sku: string;
  name: string;
  type: 'product' | 'service';
  unit: string;
  unitPrice: number;
  costPrice: number;
  taxRate: number;
  quantityOnHand: number;
  reorderLevel: number;
}

export interface ErpOrder extends BaseEntity {
  orderNumber: string;
  type: 'sales' | 'purchase';
  status: string;
  clientId: string;
  orderDate: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  items?: ErpOrderItem[];
}

export interface ErpOrderItem {
  id: string;
  orderId: string;
  inventoryId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
  lineTotal: number;
}

export interface ErpInvoice extends BaseEntity {
  invoiceNumber: string;
  type: 'invoice' | 'credit_note';
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  clientId: string;
  orderId?: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  originalInvoiceId?: string;
  items?: ErpInvoiceItem[];
}

export interface ErpInvoiceItem {
  id: string;
  invoiceId: string;
  inventoryId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  taxRate: number;
  lineTotal: number;
}

export interface ErpPayment extends BaseEntity {
  paymentNumber: string;
  clientId: string;
  invoiceId?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
}

export interface ErpLedgerEntry extends BaseEntity {
  transactionId: string;
  accountCode: string;
  entryType: 'debit' | 'credit';
  amount: number;
  sourceType: string;
  sourceId: string;
  entryDate: string;
}

export interface ErpChartOfAccounts extends BaseEntity {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parentCode?: string;
}

// Agent Entities
export interface Agent extends BaseEntity {
  name: string;
  description?: string;
  avatarUrl?: string;
  type: 'assistant' | 'automation';
  status: 'active' | 'paused' | 'disabled';
  apiKeyHash: string;
  config: Record<string, unknown>;
}

export interface AgentActionLog extends BaseEntity {
  agentId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: 'success' | 'failed' | 'pending_approval';
  approvedBy?: string;
}

// Chat Entities
export interface Conversation extends BaseEntity {
  title?: string;
  type: 'entity_thread' | 'general' | 'agent_initiated';
  status: 'open' | 'resolved' | 'archived';
  entityType?: string;
  entityId?: string;
  createdBy: string;
  lastMessageAt?: string;
}

export interface Message extends BaseEntity {
  conversationId: string;
  senderType: 'user' | 'agent' | 'system';
  senderId: string;
  content: string;
  contentType: 'text' | 'action_request' | 'action_result' | 'email_preview';
  metadata?: Record<string, unknown>;
}

// Email Entities
export interface EmailAccount extends BaseEntity {
  emailAddress: string;
  provider: 'gmail' | 'outlook' | 'imap';
  syncStatus: string;
  lastSyncAt?: string;
  config?: Record<string, unknown>;
}

export interface Email extends BaseEntity {
  emailAccountId: string;
  messageId?: string;
  threadId?: string;
  fromAddress: string;
  toAddresses: string[];
  cc: string[];
  subject: string;
  bodyText?: string;
  bodyHtml?: string;
  direction: 'inbound' | 'outbound';
  status: 'received' | 'draft' | 'sent' | 'failed';
  sentAt?: string;
  receivedAt?: string;
  entityType?: string;
  entityId?: string;
}
