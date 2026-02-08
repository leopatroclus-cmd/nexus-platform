import { eq, and, asc } from 'drizzle-orm';
import { erpChartOfAccounts } from '@nexus/database';
import type { Database } from '@nexus/database';

export async function listAccounts(db: Database, orgId: string) {
  return db.select().from(erpChartOfAccounts).where(eq(erpChartOfAccounts.orgId, orgId))
    .orderBy(asc(erpChartOfAccounts.code));
}

export async function createAccount(db: Database, orgId: string, data: any) {
  const [account] = await db.insert(erpChartOfAccounts).values({ ...data, orgId }).returning();
  return account;
}

export async function updateAccount(db: Database, orgId: string, id: string, data: any) {
  const [account] = await db.update(erpChartOfAccounts).set(data)
    .where(and(eq(erpChartOfAccounts.id, id), eq(erpChartOfAccounts.orgId, orgId))).returning();
  return account || null;
}

export async function deleteAccount(db: Database, orgId: string, id: string) {
  await db.delete(erpChartOfAccounts).where(and(eq(erpChartOfAccounts.id, id), eq(erpChartOfAccounts.orgId, orgId)));
}

export async function seedDefaults(db: Database, orgId: string) {
  const existing = await db.select().from(erpChartOfAccounts).where(eq(erpChartOfAccounts.orgId, orgId)).limit(1);
  if (existing.length > 0) return;

  await db.insert(erpChartOfAccounts).values([
    { orgId, code: '1000', name: 'Cash', type: 'asset' },
    { orgId, code: '1100', name: 'Accounts Receivable', type: 'asset' },
    { orgId, code: '1200', name: 'Inventory', type: 'asset' },
    { orgId, code: '2000', name: 'Accounts Payable', type: 'liability' },
    { orgId, code: '2100', name: 'Tax Payable', type: 'liability' },
    { orgId, code: '3000', name: "Owner's Equity", type: 'equity' },
    { orgId, code: '4000', name: 'Sales Revenue', type: 'revenue' },
    { orgId, code: '4100', name: 'Service Revenue', type: 'revenue' },
    { orgId, code: '5000', name: 'Cost of Goods Sold', type: 'expense' },
    { orgId, code: '5100', name: 'Operating Expenses', type: 'expense' },
  ]);
}
