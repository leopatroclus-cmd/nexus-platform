import { eq, and, gte, lte, desc, lt, sum, count, sql } from 'drizzle-orm';
import { erpInvoices, erpPayments, erpClients } from '@nexus/database';
import type { Database } from '@nexus/database';

export async function getQuickStats(db: Database, orgId: string) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  // Revenue (paid invoices) for each period
  const revenueQuery = async (start: Date, end: Date) => {
    const [result] = await db
      .select({ total: sum(erpInvoices.total) })
      .from(erpInvoices)
      .where(and(
        eq(erpInvoices.orgId, orgId),
        eq(erpInvoices.status, 'paid'),
        gte(erpInvoices.issueDate, start),
        lte(erpInvoices.issueDate, end),
      ));
    return parseFloat(result?.total || '0');
  };

  const [revenueToday, revenueThisWeek, revenueThisMonth, revenueLastMonth] = await Promise.all([
    revenueQuery(todayStart, now),
    revenueQuery(weekStart, now),
    revenueQuery(monthStart, now),
    revenueQuery(lastMonthStart, lastMonthEnd),
  ]);

  // Receivables: total outstanding and overdue
  const [receivablesTotal] = await db
    .select({ total: sum(erpInvoices.balanceDue), count: count() })
    .from(erpInvoices)
    .where(and(
      eq(erpInvoices.orgId, orgId),
      sql`${erpInvoices.balanceDue}::numeric > 0`,
    ));

  const [overdueResult] = await db
    .select({ total: sum(erpInvoices.balanceDue), count: count() })
    .from(erpInvoices)
    .where(and(
      eq(erpInvoices.orgId, orgId),
      sql`${erpInvoices.balanceDue}::numeric > 0`,
      lt(erpInvoices.dueDate, now),
    ));

  // Recent activity: last 5 invoices + last 5 payments, merged & sorted
  const recentInvoices = await db.select({
    id: erpInvoices.id,
    date: erpInvoices.issueDate,
    reference: erpInvoices.invoiceNumber,
    amount: erpInvoices.total,
    status: erpInvoices.status,
    clientId: erpInvoices.clientId,
  }).from(erpInvoices)
    .where(eq(erpInvoices.orgId, orgId))
    .orderBy(desc(erpInvoices.issueDate))
    .limit(5);

  const recentPayments = await db.select({
    id: erpPayments.id,
    date: erpPayments.paymentDate,
    reference: erpPayments.paymentNumber,
    amount: erpPayments.amount,
    status: erpPayments.status,
    clientId: erpPayments.clientId,
  }).from(erpPayments)
    .where(eq(erpPayments.orgId, orgId))
    .orderBy(desc(erpPayments.paymentDate))
    .limit(5);

  const recentActivity = [
    ...recentInvoices.map(i => ({ ...i, type: 'invoice' as const, date: i.date.toISOString(), amount: parseFloat(i.amount) })),
    ...recentPayments.map(p => ({ ...p, type: 'payment' as const, date: p.date.toISOString(), amount: parseFloat(p.amount) })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

  // Top 3 clients by revenue this month
  const topClients = await db
    .select({
      clientId: erpInvoices.clientId,
      clientName: erpClients.name,
      revenue: sum(erpInvoices.total),
      invoiceCount: count(),
    })
    .from(erpInvoices)
    .innerJoin(erpClients, eq(erpInvoices.clientId, erpClients.id))
    .where(and(
      eq(erpInvoices.orgId, orgId),
      eq(erpInvoices.status, 'paid'),
      gte(erpInvoices.issueDate, monthStart),
    ))
    .groupBy(erpInvoices.clientId, erpClients.name)
    .orderBy(desc(sum(erpInvoices.total)))
    .limit(3);

  return {
    revenue: {
      today: revenueToday,
      thisWeek: revenueThisWeek,
      thisMonth: revenueThisMonth,
      lastMonth: revenueLastMonth,
    },
    receivables: {
      total: parseFloat(receivablesTotal?.total || '0'),
      totalCount: receivablesTotal?.count || 0,
      overdue: parseFloat(overdueResult?.total || '0'),
      overdueCount: overdueResult?.count || 0,
    },
    recentActivity,
    topClients: topClients.map(c => ({
      clientId: c.clientId,
      clientName: c.clientName,
      revenue: parseFloat(c.revenue || '0'),
      invoiceCount: c.invoiceCount,
    })),
  };
}
