import { eq, and, desc, count } from 'drizzle-orm';
import { erpOrders, erpOrderItems, erpInvoices, erpInvoiceItems } from '@nexus/database';
import type { Database } from '@nexus/database';
import { getNextNumber } from './sequences.service.js';

function calcLineTotal(qty: number, price: number, discPct: number, taxRate: number) {
  const subtotal = qty * price;
  const afterDisc = subtotal * (1 - discPct / 100);
  return Math.round(afterDisc * (1 + taxRate / 100) * 100) / 100;
}

function calcTotals(items: any[], orderDiscount: number) {
  let subtotal = 0;
  let tax = 0;
  for (const item of items) {
    const lineSubtotal = item.quantity * item.unitPrice * (1 - (item.discountPct || 0) / 100);
    subtotal += lineSubtotal;
    tax += lineSubtotal * ((item.taxRate || 0) / 100);
  }
  subtotal = Math.round(subtotal * 100) / 100;
  tax = Math.round(tax * 100) / 100;
  const total = Math.round((subtotal + tax - orderDiscount) * 100) / 100;
  return { subtotal, tax, total };
}

export async function listOrders(db: Database, orgId: string, params: {
  page?: number; limit?: number; type?: string; status?: string; clientId?: string;
}) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 25, 100);
  const offset = (page - 1) * limit;

  const conditions = [eq(erpOrders.orgId, orgId)];
  if (params.type) conditions.push(eq(erpOrders.type, params.type));
  if (params.status) conditions.push(eq(erpOrders.status, params.status));
  if (params.clientId) conditions.push(eq(erpOrders.clientId, params.clientId));

  const [totalResult] = await db.select({ count: count() }).from(erpOrders).where(and(...conditions));
  const data = await db.select().from(erpOrders).where(and(...conditions))
    .orderBy(desc(erpOrders.createdAt)).limit(limit).offset(offset);

  return { data, pagination: { page, limit, total: totalResult.count, totalPages: Math.ceil(totalResult.count / limit) } };
}

export async function getOrderById(db: Database, orgId: string, id: string) {
  const [order] = await db.select().from(erpOrders)
    .where(and(eq(erpOrders.id, id), eq(erpOrders.orgId, orgId))).limit(1);
  if (!order) return null;
  const items = await db.select().from(erpOrderItems).where(eq(erpOrderItems.orderId, id));
  return { ...order, items };
}

export async function createOrder(db: Database, orgId: string, data: any) {
  const orderNumber = await getNextNumber(db, orgId, 'erp_order', 'ORD-');
  const { subtotal, tax, total } = calcTotals(data.items, data.discount || 0);

  const [order] = await db.insert(erpOrders).values({
    orgId, orderNumber, type: data.type, status: data.status || 'draft',
    clientId: data.clientId, orderDate: new Date(data.orderDate),
    subtotal: String(subtotal), tax: String(tax), discount: String(data.discount || 0), total: String(total),
    customData: data.customData,
  }).returning();

  const itemRows = data.items.map((item: any) => ({
    orderId: order.id,
    inventoryId: item.inventoryId || null,
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    discountPct: String(item.discountPct || 0),
    taxRate: String(item.taxRate || 0),
    lineTotal: String(calcLineTotal(item.quantity, item.unitPrice, item.discountPct || 0, item.taxRate || 0)),
  }));

  const items = await db.insert(erpOrderItems).values(itemRows).returning();
  return { ...order, items };
}

export async function updateOrder(db: Database, orgId: string, id: string, data: any) {
  const updateData: any = { ...data, updatedAt: new Date() };
  delete updateData.items;

  if (data.items) {
    const { subtotal, tax, total } = calcTotals(data.items, data.discount || 0);
    updateData.subtotal = String(subtotal);
    updateData.tax = String(tax);
    updateData.total = String(total);

    await db.delete(erpOrderItems).where(eq(erpOrderItems.orderId, id));
    const itemRows = data.items.map((item: any) => ({
      orderId: id,
      inventoryId: item.inventoryId || null,
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      discountPct: String(item.discountPct || 0),
      taxRate: String(item.taxRate || 0),
      lineTotal: String(calcLineTotal(item.quantity, item.unitPrice, item.discountPct || 0, item.taxRate || 0)),
    }));
    await db.insert(erpOrderItems).values(itemRows);
  }

  if (data.discount !== undefined) updateData.discount = String(data.discount);

  const [order] = await db.update(erpOrders).set(updateData)
    .where(and(eq(erpOrders.id, id), eq(erpOrders.orgId, orgId))).returning();
  return order || null;
}

export async function deleteOrder(db: Database, orgId: string, id: string) {
  await db.delete(erpOrders).where(and(eq(erpOrders.id, id), eq(erpOrders.orgId, orgId)));
}

export async function convertToInvoice(db: Database, orgId: string, orderId: string) {
  const order = await getOrderById(db, orgId, orderId);
  if (!order) return null;

  const invoiceNumber = await getNextNumber(db, orgId, 'erp_invoice', 'INV-');
  const now = new Date();
  const dueDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [invoice] = await db.insert(erpInvoices).values({
    orgId, invoiceNumber, type: 'invoice', status: 'draft',
    clientId: order.clientId, orderId: order.id,
    issueDate: now, dueDate,
    subtotal: order.subtotal, tax: order.tax, discount: order.discount, total: order.total,
    amountPaid: '0', balanceDue: order.total,
  }).returning();

  if (order.items) {
    const invoiceItems = order.items.map((item: any) => ({
      invoiceId: invoice.id,
      inventoryId: item.inventoryId,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountPct: item.discountPct,
      taxRate: item.taxRate,
      lineTotal: item.lineTotal,
    }));
    await db.insert(erpInvoiceItems).values(invoiceItems);
  }

  return invoice;
}
