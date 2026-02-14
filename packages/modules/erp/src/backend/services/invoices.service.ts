import { eq, and, desc, count } from 'drizzle-orm';
import { erpInvoices, erpInvoiceItems, organizations } from '@nexus/database';
import type { Database } from '@nexus/database';
import { getNextNumber } from './sequences.service.js';

function calcLineTotal(qty: number, price: number, discPct: number, taxRate: number) {
  const sub = qty * price * (1 - discPct / 100);
  return Math.round(sub * (1 + taxRate / 100) * 100) / 100;
}

function calcTotals(items: any[], discount: number) {
  let subtotal = 0, tax = 0;
  for (const item of items) {
    const lineSub = item.quantity * item.unitPrice * (1 - (item.discountPct || 0) / 100);
    subtotal += lineSub;
    tax += lineSub * ((item.taxRate || 0) / 100);
  }
  subtotal = Math.round(subtotal * 100) / 100;
  tax = Math.round(tax * 100) / 100;
  return { subtotal, tax, total: Math.round((subtotal + tax - discount) * 100) / 100 };
}

export async function listInvoices(db: Database, orgId: string, params: {
  page?: number; limit?: number; status?: string; clientId?: string; type?: string;
}) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 25, 100);
  const offset = (page - 1) * limit;

  const conditions = [eq(erpInvoices.orgId, orgId)];
  if (params.status) conditions.push(eq(erpInvoices.status, params.status));
  if (params.clientId) conditions.push(eq(erpInvoices.clientId, params.clientId));
  if (params.type) conditions.push(eq(erpInvoices.type, params.type));

  const [totalResult] = await db.select({ count: count() }).from(erpInvoices).where(and(...conditions));
  const data = await db.select().from(erpInvoices).where(and(...conditions))
    .orderBy(desc(erpInvoices.createdAt)).limit(limit).offset(offset);

  return { data, pagination: { page, limit, total: totalResult.count, totalPages: Math.ceil(totalResult.count / limit) } };
}

export async function getInvoiceById(db: Database, orgId: string, id: string) {
  const [invoice] = await db.select().from(erpInvoices)
    .where(and(eq(erpInvoices.id, id), eq(erpInvoices.orgId, orgId))).limit(1);
  if (!invoice) return null;
  const items = await db.select().from(erpInvoiceItems).where(eq(erpInvoiceItems.invoiceId, id));
  return { ...invoice, items };
}

export async function createInvoice(db: Database, orgId: string, data: any) {
  const [org] = await db.select({ invoicePrefix: organizations.invoicePrefix })
    .from(organizations).where(eq(organizations.id, orgId)).limit(1);
  const prefix = org?.invoicePrefix || 'INV-';
  const invoiceNumber = await getNextNumber(db, orgId, 'erp_invoice', prefix);
  const { subtotal, tax, total } = calcTotals(data.items, data.discount || 0);

  const [invoice] = await db.insert(erpInvoices).values({
    orgId, invoiceNumber, type: data.type || 'invoice', status: 'draft',
    clientId: data.clientId, orderId: data.orderId || null,
    issueDate: new Date(data.issueDate), dueDate: new Date(data.dueDate),
    subtotal: String(subtotal), tax: String(tax), discount: String(data.discount || 0),
    total: String(total), amountPaid: '0', balanceDue: String(total),
    originalInvoiceId: data.originalInvoiceId || null, customData: data.customData,
  }).returning();

  const itemRows = data.items.map((item: any) => ({
    invoiceId: invoice.id, inventoryId: item.inventoryId || null,
    description: item.description, quantity: String(item.quantity),
    unitPrice: String(item.unitPrice), discountPct: String(item.discountPct || 0),
    taxRate: String(item.taxRate || 0),
    lineTotal: String(calcLineTotal(item.quantity, item.unitPrice, item.discountPct || 0, item.taxRate || 0)),
  }));
  const items = await db.insert(erpInvoiceItems).values(itemRows).returning();

  return { ...invoice, items };
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ['sent', 'void'],
  sent: ['paid', 'overdue', 'void'],
  overdue: ['paid', 'void'],
  paid: [],
  void: [],
};

export async function updateStatus(db: Database, orgId: string, id: string, newStatus: string) {
  const [existing] = await db.select().from(erpInvoices)
    .where(and(eq(erpInvoices.id, id), eq(erpInvoices.orgId, orgId))).limit(1);
  if (!existing) return null;

  const allowed = VALID_TRANSITIONS[existing.status];
  if (!allowed || !allowed.includes(newStatus)) {
    throw new Error(`Cannot transition invoice from '${existing.status}' to '${newStatus}'`);
  }

  const [invoice] = await db.update(erpInvoices).set({ status: newStatus, updatedAt: new Date() })
    .where(eq(erpInvoices.id, id)).returning();
  return invoice;
}

export async function issueInvoice(db: Database, orgId: string, id: string) {
  const [existing] = await db.select().from(erpInvoices)
    .where(and(eq(erpInvoices.id, id), eq(erpInvoices.orgId, orgId))).limit(1);
  if (!existing) return null;

  if (existing.status !== 'draft') {
    throw new Error(`Cannot issue invoice: current status is '${existing.status}', expected 'draft'`);
  }

  const [invoice] = await db.update(erpInvoices)
    .set({ status: 'sent', issuedAt: new Date(), updatedAt: new Date() })
    .where(eq(erpInvoices.id, id)).returning();
  return invoice;
}

export async function createCreditNote(db: Database, orgId: string, originalInvoiceId: string, items: any[]) {
  const original = await getInvoiceById(db, orgId, originalInvoiceId);
  if (!original) return null;

  const creditNumber = await getNextNumber(db, orgId, 'erp_invoice', 'CN-');
  const { subtotal, tax, total } = calcTotals(items, 0);

  const [creditNote] = await db.insert(erpInvoices).values({
    orgId, invoiceNumber: creditNumber, type: 'credit_note', status: 'draft',
    clientId: original.clientId, originalInvoiceId,
    issueDate: new Date(), dueDate: new Date(),
    subtotal: String(subtotal), tax: String(tax), discount: '0',
    total: String(total), amountPaid: '0', balanceDue: String(total),
  }).returning();

  const itemRows = items.map((item: any) => ({
    invoiceId: creditNote.id, inventoryId: item.inventoryId || null,
    description: item.description, quantity: String(item.quantity),
    unitPrice: String(item.unitPrice), discountPct: String(item.discountPct || 0),
    taxRate: String(item.taxRate || 0),
    lineTotal: String(calcLineTotal(item.quantity, item.unitPrice, item.discountPct || 0, item.taxRate || 0)),
  }));
  await db.insert(erpInvoiceItems).values(itemRows);

  return creditNote;
}

export async function deleteInvoice(db: Database, orgId: string, id: string) {
  await db.delete(erpInvoices).where(and(eq(erpInvoices.id, id), eq(erpInvoices.orgId, orgId)));
}
