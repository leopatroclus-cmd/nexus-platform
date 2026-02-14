import { eq, and, ilike, desc, count, gte, lte, asc } from 'drizzle-orm';
import { erpClients, crmCompanies, erpInvoices, erpPayments } from '@nexus/database';
import type { Database } from '@nexus/database';

export async function listClients(db: Database, orgId: string, params: {
  page?: number; limit?: number; search?: string; type?: string;
}) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 25, 100);
  const offset = (page - 1) * limit;

  const conditions = [eq(erpClients.orgId, orgId)];
  if (params.search) conditions.push(ilike(erpClients.name, `%${params.search}%`));
  if (params.type) conditions.push(eq(erpClients.type, params.type));

  const [totalResult] = await db.select({ count: count() }).from(erpClients).where(and(...conditions));
  const data = await db.select().from(erpClients).where(and(...conditions))
    .orderBy(desc(erpClients.createdAt)).limit(limit).offset(offset);

  return { data, pagination: { page, limit, total: totalResult.count, totalPages: Math.ceil(totalResult.count / limit) } };
}

export async function getClientById(db: Database, orgId: string, id: string) {
  const [client] = await db.select().from(erpClients)
    .where(and(eq(erpClients.id, id), eq(erpClients.orgId, orgId))).limit(1);
  return client || null;
}

export async function createClient(db: Database, orgId: string, data: any) {
  const [client] = await db.insert(erpClients).values({ ...data, orgId }).returning();
  return client;
}

export async function updateClient(db: Database, orgId: string, id: string, data: any) {
  const [client] = await db.update(erpClients).set({ ...data, updatedAt: new Date() })
    .where(and(eq(erpClients.id, id), eq(erpClients.orgId, orgId))).returning();
  return client || null;
}

export async function deleteClient(db: Database, orgId: string, id: string) {
  await db.delete(erpClients).where(and(eq(erpClients.id, id), eq(erpClients.orgId, orgId)));
}

export async function getClientStatement(
  db: Database,
  orgId: string,
  clientId: string,
  options?: { startDate?: Date; endDate?: Date },
) {
  const [client] = await db.select().from(erpClients)
    .where(and(eq(erpClients.id, clientId), eq(erpClients.orgId, orgId))).limit(1);
  if (!client) return null;

  // Build date filters
  const invoiceConditions = [eq(erpInvoices.orgId, orgId), eq(erpInvoices.clientId, clientId)];
  const paymentConditions = [eq(erpPayments.orgId, orgId), eq(erpPayments.clientId, clientId)];
  if (options?.startDate) {
    invoiceConditions.push(gte(erpInvoices.issueDate, options.startDate));
    paymentConditions.push(gte(erpPayments.paymentDate, options.startDate));
  }
  if (options?.endDate) {
    invoiceConditions.push(lte(erpInvoices.issueDate, options.endDate));
    paymentConditions.push(lte(erpPayments.paymentDate, options.endDate));
  }

  const invoices = await db.select().from(erpInvoices)
    .where(and(...invoiceConditions)).orderBy(asc(erpInvoices.issueDate));
  const payments = await db.select().from(erpPayments)
    .where(and(...paymentConditions)).orderBy(asc(erpPayments.paymentDate));

  // Merge into chronological transaction list
  type Transaction = {
    date: string;
    type: 'invoice' | 'payment';
    reference: string;
    description: string;
    amount: number;
    runningBalance: number;
  };

  const transactions: Transaction[] = [];

  for (const inv of invoices) {
    transactions.push({
      date: inv.issueDate.toISOString(),
      type: 'invoice',
      reference: inv.invoiceNumber,
      description: `Invoice ${inv.invoiceNumber} (${inv.status})`,
      amount: parseFloat(inv.total),
      runningBalance: 0, // computed below
    });
  }

  for (const pmt of payments) {
    transactions.push({
      date: pmt.paymentDate.toISOString(),
      type: 'payment',
      reference: pmt.paymentNumber,
      description: `Payment ${pmt.paymentNumber} via ${pmt.paymentMethod}`,
      amount: -parseFloat(pmt.amount),
      runningBalance: 0, // computed below
    });
  }

  // Sort chronologically
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Compute running balance
  let balance = 0;
  for (const txn of transactions) {
    balance += txn.amount;
    txn.runningBalance = Math.round(balance * 100) / 100;
  }

  const totalInvoiced = transactions
    .filter(t => t.type === 'invoice')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalPaid = transactions
    .filter(t => t.type === 'payment')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  return {
    client: { id: client.id, name: client.name, type: client.type, currency: client.currency },
    transactions,
    openingBalance: 0,
    closingBalance: Math.round(balance * 100) / 100,
    totalInvoiced: Math.round(totalInvoiced * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
  };
}

export async function convertFromCrm(db: Database, orgId: string, crmCompanyId: string) {
  const [company] = await db.select().from(crmCompanies)
    .where(and(eq(crmCompanies.id, crmCompanyId), eq(crmCompanies.orgId, orgId))).limit(1);
  if (!company) return null;

  const [client] = await db.insert(erpClients).values({
    orgId,
    name: company.name,
    type: 'customer',
    currency: 'USD',
    crmCompanyId: company.id,
    billingAddress: company.address as any,
  }).returning();
  return client;
}
