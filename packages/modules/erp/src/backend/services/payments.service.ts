import { eq, and, desc, count, sql } from 'drizzle-orm';
import { erpPayments, erpInvoices, erpLedgerEntries } from '@nexus/database';
import type { Database } from '@nexus/database';
import { getNextNumber } from './sequences.service.js';
import { v4 as uuidv4 } from 'uuid';

export async function listPayments(db: Database, orgId: string, params: {
  page?: number; limit?: number; clientId?: string; invoiceId?: string;
}) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 25, 100);
  const offset = (page - 1) * limit;

  const conditions = [eq(erpPayments.orgId, orgId)];
  if (params.clientId) conditions.push(eq(erpPayments.clientId, params.clientId));
  if (params.invoiceId) conditions.push(eq(erpPayments.invoiceId, params.invoiceId));

  const [totalResult] = await db.select({ count: count() }).from(erpPayments).where(and(...conditions));
  const data = await db.select().from(erpPayments).where(and(...conditions))
    .orderBy(desc(erpPayments.createdAt)).limit(limit).offset(offset);

  return { data, pagination: { page, limit, total: totalResult.count, totalPages: Math.ceil(totalResult.count / limit) } };
}

export async function getPaymentById(db: Database, orgId: string, id: string) {
  const [payment] = await db.select().from(erpPayments)
    .where(and(eq(erpPayments.id, id), eq(erpPayments.orgId, orgId))).limit(1);
  return payment || null;
}

export async function createPayment(db: Database, orgId: string, data: any) {
  const paymentNumber = await getNextNumber(db, orgId, 'erp_payment', 'PAY-');

  const [payment] = await db.insert(erpPayments).values({
    orgId, paymentNumber, clientId: data.clientId,
    invoiceId: data.invoiceId || null,
    amount: String(data.amount),
    paymentDate: new Date(data.paymentDate),
    paymentMethod: data.paymentMethod,
    status: data.status || 'completed',
  }).returning();

  // Update invoice if linked
  if (data.invoiceId) {
    await db.update(erpInvoices).set({
      amountPaid: sql`CAST(${erpInvoices.amountPaid} AS numeric) + ${data.amount}`,
      balanceDue: sql`CAST(${erpInvoices.balanceDue} AS numeric) - ${data.amount}`,
      updatedAt: new Date(),
    }).where(eq(erpInvoices.id, data.invoiceId));

    // Check if fully paid
    const [invoice] = await db.select().from(erpInvoices).where(eq(erpInvoices.id, data.invoiceId)).limit(1);
    if (invoice && parseFloat(invoice.balanceDue as string) <= 0) {
      await db.update(erpInvoices).set({ status: 'paid', updatedAt: new Date() })
        .where(eq(erpInvoices.id, data.invoiceId));
    }
  }

  // Create ledger entries (double-entry)
  const transactionId = uuidv4();
  await db.insert(erpLedgerEntries).values([
    {
      orgId, transactionId, accountCode: '1000', entryType: 'debit',
      amount: String(data.amount), description: `Payment ${paymentNumber}`,
      sourceType: 'erp_payment', sourceId: payment.id, entryDate: new Date(data.paymentDate),
    },
    {
      orgId, transactionId, accountCode: '1100', entryType: 'credit',
      amount: String(data.amount), description: `Payment ${paymentNumber}`,
      sourceType: 'erp_payment', sourceId: payment.id, entryDate: new Date(data.paymentDate),
    },
  ]);

  return payment;
}

export async function deletePayment(db: Database, orgId: string, id: string) {
  await db.delete(erpPayments).where(and(eq(erpPayments.id, id), eq(erpPayments.orgId, orgId)));
}
