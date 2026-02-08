import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { erpLedgerEntries } from '@nexus/database';
import type { Database } from '@nexus/database';
import { v4 as uuidv4 } from 'uuid';

export async function listEntries(db: Database, orgId: string, params: {
  page?: number; limit?: number; accountCode?: string; startDate?: string; endDate?: string;
}) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 50, 200);
  const offset = (page - 1) * limit;

  const conditions = [eq(erpLedgerEntries.orgId, orgId)];
  if (params.accountCode) conditions.push(eq(erpLedgerEntries.accountCode, params.accountCode));
  if (params.startDate) conditions.push(gte(erpLedgerEntries.entryDate, new Date(params.startDate)));
  if (params.endDate) conditions.push(lte(erpLedgerEntries.entryDate, new Date(params.endDate)));

  const data = await db.select().from(erpLedgerEntries).where(and(...conditions))
    .orderBy(desc(erpLedgerEntries.entryDate)).limit(limit).offset(offset);

  return { data, pagination: { page, limit } };
}

export async function getBalances(db: Database, orgId: string) {
  const results = await db
    .select({
      accountCode: erpLedgerEntries.accountCode,
      entryType: erpLedgerEntries.entryType,
      total: sql<string>`SUM(CAST(${erpLedgerEntries.amount} AS numeric))`,
    })
    .from(erpLedgerEntries)
    .where(eq(erpLedgerEntries.orgId, orgId))
    .groupBy(erpLedgerEntries.accountCode, erpLedgerEntries.entryType);

  const balances: Record<string, { debit: number; credit: number; balance: number }> = {};
  for (const row of results) {
    if (!balances[row.accountCode]) {
      balances[row.accountCode] = { debit: 0, credit: 0, balance: 0 };
    }
    if (row.entryType === 'debit') {
      balances[row.accountCode].debit = parseFloat(row.total);
    } else {
      balances[row.accountCode].credit = parseFloat(row.total);
    }
  }

  for (const code in balances) {
    balances[code].balance = balances[code].debit - balances[code].credit;
  }

  return balances;
}

export async function createEntries(db: Database, orgId: string, entries: {
  accountCode: string; entryType: 'debit' | 'credit'; amount: number;
  description?: string; sourceType?: string; sourceId?: string; entryDate: string;
}[]) {
  // Validate: debits must equal credits
  let totalDebit = 0, totalCredit = 0;
  for (const e of entries) {
    if (e.entryType === 'debit') totalDebit += e.amount;
    else totalCredit += e.amount;
  }
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Unbalanced entries: debits ${totalDebit} != credits ${totalCredit}`);
  }

  const transactionId = uuidv4();
  const rows = entries.map(e => ({
    orgId, transactionId, accountCode: e.accountCode,
    entryType: e.entryType, amount: String(e.amount),
    description: e.description, sourceType: e.sourceType,
    sourceId: e.sourceId, entryDate: new Date(e.entryDate),
  }));

  return db.insert(erpLedgerEntries).values(rows).returning();
}
