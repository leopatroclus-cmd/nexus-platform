import { eq, and, sql, gte, lte, desc, asc, count, sum, lt } from 'drizzle-orm';
import { erpInvoices, erpPayments, erpClients } from '@nexus/database';
import type { Database } from '@nexus/database';

// ─── Dashboard Summary ───

export async function getDashboardSummary(db: Database, orgId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  // Revenue from paid invoices per period
  const revenueForPeriod = async (start: Date, end: Date) => {
    const [r] = await db
      .select({ total: sql<string>`COALESCE(SUM(CAST(${erpInvoices.total} AS numeric)), 0)` })
      .from(erpInvoices)
      .where(and(
        eq(erpInvoices.orgId, orgId),
        eq(erpInvoices.status, 'paid'),
        gte(erpInvoices.issueDate, start),
        lte(erpInvoices.issueDate, end),
      ));
    return parseFloat(r?.total || '0');
  };

  const [today, thisWeek, thisMonth, thisYear] = await Promise.all([
    revenueForPeriod(todayStart, now),
    revenueForPeriod(weekStart, now),
    revenueForPeriod(monthStart, now),
    revenueForPeriod(yearStart, now),
  ]);

  // Receivables
  const [outstanding] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(${erpInvoices.balanceDue} AS numeric)), 0)`,
      count: count(),
    })
    .from(erpInvoices)
    .where(and(eq(erpInvoices.orgId, orgId), sql`CAST(${erpInvoices.balanceDue} AS numeric) > 0`));

  const [overdue] = await db
    .select({
      total: sql<string>`COALESCE(SUM(CAST(${erpInvoices.balanceDue} AS numeric)), 0)`,
      count: count(),
    })
    .from(erpInvoices)
    .where(and(
      eq(erpInvoices.orgId, orgId),
      sql`CAST(${erpInvoices.balanceDue} AS numeric) > 0`,
      lt(erpInvoices.dueDate, now),
    ));

  // Counts
  const [clientCount] = await db.select({ count: count() }).from(erpClients).where(eq(erpClients.orgId, orgId));
  const [invoiceCount] = await db.select({ count: count() }).from(erpInvoices).where(eq(erpInvoices.orgId, orgId));
  const [paymentCount] = await db.select({ count: count() }).from(erpPayments).where(eq(erpPayments.orgId, orgId));

  // Top 5 clients by revenue (last 30 days)
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const topClients = await db
    .select({
      clientId: erpInvoices.clientId,
      clientName: erpClients.name,
      revenue: sql<string>`COALESCE(SUM(CAST(${erpInvoices.total} AS numeric)), 0)`,
      invoiceCount: count(),
    })
    .from(erpInvoices)
    .innerJoin(erpClients, eq(erpInvoices.clientId, erpClients.id))
    .where(and(
      eq(erpInvoices.orgId, orgId),
      eq(erpInvoices.status, 'paid'),
      gte(erpInvoices.issueDate, thirtyDaysAgo),
    ))
    .groupBy(erpInvoices.clientId, erpClients.name)
    .orderBy(desc(sql`SUM(CAST(${erpInvoices.total} AS numeric))`))
    .limit(5);

  return {
    revenue: { today, thisWeek, thisMonth, thisYear },
    receivables: {
      totalOutstanding: parseFloat(outstanding?.total || '0'),
      outstandingCount: outstanding?.count || 0,
      totalOverdue: parseFloat(overdue?.total || '0'),
      overdueCount: overdue?.count || 0,
    },
    counts: {
      clients: clientCount?.count || 0,
      invoices: invoiceCount?.count || 0,
      payments: paymentCount?.count || 0,
    },
    topClients: topClients.map(c => ({
      clientId: c.clientId,
      clientName: c.clientName,
      revenue: parseFloat(c.revenue || '0'),
      invoiceCount: c.invoiceCount,
    })),
  };
}

// ─── Revenue Time-Series ───

export async function getRevenueTimeSeries(db: Database, orgId: string, params: {
  groupBy?: 'day' | 'week' | 'month';
  startDate?: string;
  endDate?: string;
}) {
  const groupBy = params.groupBy || 'month';
  const conditions = [eq(erpInvoices.orgId, orgId), eq(erpInvoices.status, 'paid')];
  if (params.startDate) conditions.push(gte(erpInvoices.issueDate, new Date(params.startDate)));
  if (params.endDate) conditions.push(lte(erpInvoices.issueDate, new Date(params.endDate)));

  let periodExpr: ReturnType<typeof sql>;
  let orderExpr: ReturnType<typeof sql>;

  if (groupBy === 'day') {
    periodExpr = sql<string>`TO_CHAR(${erpInvoices.issueDate}, 'YYYY-MM-DD')`;
    orderExpr = sql`TO_CHAR(${erpInvoices.issueDate}, 'YYYY-MM-DD')`;
  } else if (groupBy === 'week') {
    periodExpr = sql<string>`TO_CHAR(DATE_TRUNC('week', ${erpInvoices.issueDate}), 'YYYY-MM-DD')`;
    orderExpr = sql`DATE_TRUNC('week', ${erpInvoices.issueDate})`;
  } else {
    periodExpr = sql<string>`TO_CHAR(${erpInvoices.issueDate}, 'YYYY-MM')`;
    orderExpr = sql`TO_CHAR(${erpInvoices.issueDate}, 'YYYY-MM')`;
  }

  const rows = await db
    .select({
      period: periodExpr,
      revenue: sql<string>`COALESCE(SUM(CAST(${erpInvoices.total} AS numeric)), 0)`,
      invoiceCount: count(),
    })
    .from(erpInvoices)
    .where(and(...conditions))
    .groupBy(periodExpr)
    .orderBy(asc(orderExpr));

  const data = rows.map(r => ({
    period: r.period,
    revenue: parseFloat(r.revenue || '0'),
    invoiceCount: r.invoiceCount,
  }));

  const totalRevenue = data.reduce((s, r) => s + r.revenue, 0);
  const totalInvoices = data.reduce((s, r) => s + r.invoiceCount, 0);

  return { groupBy, data, totals: { revenue: totalRevenue, invoices: totalInvoices } };
}
