import { eq, and, sql, gte, lte, desc, asc, ne } from 'drizzle-orm';
import {
  erpOrders,
  erpOrderItems,
  erpClients,
  erpInventory,
  erpInvoices,
  erpPayments,
} from '@nexus/database';
import type { Database } from '@nexus/database';

// ─── Revenue Analytics ───

export async function getRevenueAnalytics(db: Database, orgId: string, params: {
  groupBy?: 'client' | 'month' | 'quarter';
  startDate?: string;
  endDate?: string;
  clientId?: string;
  limit?: number;
  sortDirection?: 'asc' | 'desc';
}) {
  const conditions = [
    eq(erpOrders.orgId, orgId),
    eq(erpOrders.type, 'sales'),
    ne(erpOrders.status, 'draft'),
    ne(erpOrders.status, 'cancelled'),
  ];
  if (params.startDate) conditions.push(gte(erpOrders.orderDate, new Date(params.startDate)));
  if (params.endDate) conditions.push(lte(erpOrders.orderDate, new Date(params.endDate)));
  if (params.clientId) conditions.push(eq(erpOrders.clientId, params.clientId));

  const limit = Math.min(params.limit || 50, 200);
  const sortDir = params.sortDirection === 'asc' ? asc : desc;
  const groupBy = params.groupBy || 'month';

  if (groupBy === 'client') {
    const results = await db
      .select({
        clientId: erpOrders.clientId,
        clientName: erpClients.name,
        totalRevenue: sql<string>`SUM(CAST(${erpOrders.total} AS numeric))`,
        orderCount: sql<number>`COUNT(*)::int`,
      })
      .from(erpOrders)
      .leftJoin(erpClients, eq(erpOrders.clientId, erpClients.id))
      .where(and(...conditions))
      .groupBy(erpOrders.clientId, erpClients.name)
      .orderBy(sortDir(sql`SUM(CAST(${erpOrders.total} AS numeric))`))
      .limit(limit);

    return results.map((r) => ({
      clientId: r.clientId,
      clientName: r.clientName,
      totalRevenue: parseFloat(r.totalRevenue) || 0,
      orderCount: r.orderCount,
    }));
  }

  if (groupBy === 'quarter') {
    const results = await db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${erpOrders.orderDate})::int`,
        quarter: sql<number>`EXTRACT(QUARTER FROM ${erpOrders.orderDate})::int`,
        totalRevenue: sql<string>`SUM(CAST(${erpOrders.total} AS numeric))`,
        orderCount: sql<number>`COUNT(*)::int`,
      })
      .from(erpOrders)
      .where(and(...conditions))
      .groupBy(
        sql`EXTRACT(YEAR FROM ${erpOrders.orderDate})`,
        sql`EXTRACT(QUARTER FROM ${erpOrders.orderDate})`,
      )
      .orderBy(
        sortDir(sql`EXTRACT(YEAR FROM ${erpOrders.orderDate})`),
        sortDir(sql`EXTRACT(QUARTER FROM ${erpOrders.orderDate})`),
      )
      .limit(limit);

    return results.map((r) => ({
      year: r.year,
      quarter: r.quarter,
      totalRevenue: parseFloat(r.totalRevenue) || 0,
      orderCount: r.orderCount,
    }));
  }

  // default: month
  const results = await db
    .select({
      year: sql<number>`EXTRACT(YEAR FROM ${erpOrders.orderDate})::int`,
      month: sql<number>`EXTRACT(MONTH FROM ${erpOrders.orderDate})::int`,
      totalRevenue: sql<string>`SUM(CAST(${erpOrders.total} AS numeric))`,
      orderCount: sql<number>`COUNT(*)::int`,
    })
    .from(erpOrders)
    .where(and(...conditions))
    .groupBy(
      sql`EXTRACT(YEAR FROM ${erpOrders.orderDate})`,
      sql`EXTRACT(MONTH FROM ${erpOrders.orderDate})`,
    )
    .orderBy(
      sortDir(sql`EXTRACT(YEAR FROM ${erpOrders.orderDate})`),
      sortDir(sql`EXTRACT(MONTH FROM ${erpOrders.orderDate})`),
    )
    .limit(limit);

  return results.map((r) => ({
    year: r.year,
    month: r.month,
    totalRevenue: parseFloat(r.totalRevenue) || 0,
    orderCount: r.orderCount,
  }));
}

// ─── Top Products ───

export async function getTopProducts(db: Database, orgId: string, params: {
  startDate: string;
  endDate: string;
  metric?: 'quantity' | 'revenue';
  limit?: number;
}) {
  const limit = Math.min(params.limit || 10, 100);
  const metric = params.metric || 'quantity';

  const orderColumn = metric === 'revenue'
    ? sql`SUM(CAST(${erpOrderItems.lineTotal} AS numeric))`
    : sql`SUM(CAST(${erpOrderItems.quantity} AS numeric))`;

  const results = await db
    .select({
      inventoryId: erpOrderItems.inventoryId,
      itemName: erpInventory.name,
      sku: erpInventory.sku,
      totalQuantity: sql<string>`SUM(CAST(${erpOrderItems.quantity} AS numeric))`,
      totalRevenue: sql<string>`SUM(CAST(${erpOrderItems.lineTotal} AS numeric))`,
      orderCount: sql<number>`COUNT(DISTINCT ${erpOrderItems.orderId})::int`,
    })
    .from(erpOrderItems)
    .innerJoin(erpOrders, and(
      eq(erpOrderItems.orderId, erpOrders.id),
      eq(erpOrders.orgId, orgId),
      eq(erpOrders.type, 'sales'),
      ne(erpOrders.status, 'draft'),
      ne(erpOrders.status, 'cancelled'),
      gte(erpOrders.orderDate, new Date(params.startDate)),
      lte(erpOrders.orderDate, new Date(params.endDate)),
    ))
    .leftJoin(erpInventory, eq(erpOrderItems.inventoryId, erpInventory.id))
    .groupBy(erpOrderItems.inventoryId, erpInventory.name, erpInventory.sku)
    .orderBy(desc(orderColumn))
    .limit(limit);

  return results.map((r, i) => ({
    rank: i + 1,
    inventoryId: r.inventoryId,
    itemName: r.itemName,
    sku: r.sku,
    totalQuantity: parseFloat(r.totalQuantity) || 0,
    totalRevenue: parseFloat(r.totalRevenue) || 0,
    orderCount: r.orderCount,
  }));
}

// ─── Invoice Analytics ───

export async function getInvoiceAnalytics(db: Database, orgId: string, params: {
  mode: 'outstanding' | 'overdue' | 'status_summary';
}) {
  const { mode } = params;

  if (mode === 'outstanding') {
    const [result] = await db
      .select({
        totalOutstanding: sql<string>`COALESCE(SUM(CAST(${erpInvoices.balanceDue} AS numeric)), 0)`,
        invoiceCount: sql<number>`COUNT(*)::int`,
      })
      .from(erpInvoices)
      .where(and(
        eq(erpInvoices.orgId, orgId),
        sql`CAST(${erpInvoices.balanceDue} AS numeric) > 0`,
      ));

    return {
      mode: 'outstanding',
      totalOutstanding: parseFloat(result.totalOutstanding) || 0,
      invoiceCount: result.invoiceCount,
    };
  }

  if (mode === 'overdue') {
    const invoices = await db
      .select({
        id: erpInvoices.id,
        invoiceNumber: erpInvoices.invoiceNumber,
        clientId: erpInvoices.clientId,
        clientName: erpClients.name,
        dueDate: erpInvoices.dueDate,
        total: erpInvoices.total,
        balanceDue: erpInvoices.balanceDue,
        daysOverdue: sql<number>`EXTRACT(DAY FROM NOW() - ${erpInvoices.dueDate})::int`,
      })
      .from(erpInvoices)
      .leftJoin(erpClients, eq(erpInvoices.clientId, erpClients.id))
      .where(and(
        eq(erpInvoices.orgId, orgId),
        sql`${erpInvoices.dueDate} < NOW()`,
        sql`CAST(${erpInvoices.balanceDue} AS numeric) > 0`,
      ))
      .orderBy(asc(erpInvoices.dueDate));

    const totalOverdue = invoices.reduce((sum, inv) => sum + (parseFloat(inv.balanceDue) || 0), 0);

    return {
      mode: 'overdue',
      totalOverdue: Math.round(totalOverdue * 100) / 100,
      invoiceCount: invoices.length,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientId: inv.clientId,
        clientName: inv.clientName,
        dueDate: inv.dueDate,
        total: parseFloat(inv.total) || 0,
        balanceDue: parseFloat(inv.balanceDue) || 0,
        daysOverdue: inv.daysOverdue,
      })),
    };
  }

  // status_summary
  const results = await db
    .select({
      status: erpInvoices.status,
      count: sql<number>`COUNT(*)::int`,
      totalAmount: sql<string>`COALESCE(SUM(CAST(${erpInvoices.total} AS numeric)), 0)`,
      totalBalanceDue: sql<string>`COALESCE(SUM(CAST(${erpInvoices.balanceDue} AS numeric)), 0)`,
    })
    .from(erpInvoices)
    .where(eq(erpInvoices.orgId, orgId))
    .groupBy(erpInvoices.status);

  return {
    mode: 'status_summary',
    statuses: results.map((r) => ({
      status: r.status,
      count: r.count,
      totalAmount: parseFloat(r.totalAmount) || 0,
      totalBalanceDue: parseFloat(r.totalBalanceDue) || 0,
    })),
  };
}

// ─── Payment Analytics ───

export async function getPaymentAnalytics(db: Database, orgId: string, params: {
  groupBy?: 'method' | 'month' | 'client';
  startDate?: string;
  endDate?: string;
  clientId?: string;
  limit?: number;
}) {
  const conditions = [
    eq(erpPayments.orgId, orgId),
    eq(erpPayments.status, 'completed'),
  ];
  if (params.startDate) conditions.push(gte(erpPayments.paymentDate, new Date(params.startDate)));
  if (params.endDate) conditions.push(lte(erpPayments.paymentDate, new Date(params.endDate)));
  if (params.clientId) conditions.push(eq(erpPayments.clientId, params.clientId));

  const limit = Math.min(params.limit || 50, 200);
  const groupBy = params.groupBy || 'method';

  if (groupBy === 'client') {
    const results = await db
      .select({
        clientId: erpPayments.clientId,
        clientName: erpClients.name,
        totalAmount: sql<string>`SUM(CAST(${erpPayments.amount} AS numeric))`,
        paymentCount: sql<number>`COUNT(*)::int`,
      })
      .from(erpPayments)
      .leftJoin(erpClients, eq(erpPayments.clientId, erpClients.id))
      .where(and(...conditions))
      .groupBy(erpPayments.clientId, erpClients.name)
      .orderBy(desc(sql`SUM(CAST(${erpPayments.amount} AS numeric))`))
      .limit(limit);

    return results.map((r) => ({
      clientId: r.clientId,
      clientName: r.clientName,
      totalAmount: parseFloat(r.totalAmount) || 0,
      paymentCount: r.paymentCount,
    }));
  }

  if (groupBy === 'month') {
    const results = await db
      .select({
        year: sql<number>`EXTRACT(YEAR FROM ${erpPayments.paymentDate})::int`,
        month: sql<number>`EXTRACT(MONTH FROM ${erpPayments.paymentDate})::int`,
        totalAmount: sql<string>`SUM(CAST(${erpPayments.amount} AS numeric))`,
        paymentCount: sql<number>`COUNT(*)::int`,
      })
      .from(erpPayments)
      .where(and(...conditions))
      .groupBy(
        sql`EXTRACT(YEAR FROM ${erpPayments.paymentDate})`,
        sql`EXTRACT(MONTH FROM ${erpPayments.paymentDate})`,
      )
      .orderBy(
        asc(sql`EXTRACT(YEAR FROM ${erpPayments.paymentDate})`),
        asc(sql`EXTRACT(MONTH FROM ${erpPayments.paymentDate})`),
      )
      .limit(limit);

    return results.map((r) => ({
      year: r.year,
      month: r.month,
      totalAmount: parseFloat(r.totalAmount) || 0,
      paymentCount: r.paymentCount,
    }));
  }

  // default: method
  const results = await db
    .select({
      paymentMethod: erpPayments.paymentMethod,
      totalAmount: sql<string>`SUM(CAST(${erpPayments.amount} AS numeric))`,
      paymentCount: sql<number>`COUNT(*)::int`,
    })
    .from(erpPayments)
    .where(and(...conditions))
    .groupBy(erpPayments.paymentMethod)
    .orderBy(desc(sql`SUM(CAST(${erpPayments.amount} AS numeric))`))
    .limit(limit);

  return results.map((r) => ({
    paymentMethod: r.paymentMethod,
    totalAmount: parseFloat(r.totalAmount) || 0,
    paymentCount: r.paymentCount,
  }));
}

// ─── Inventory Analytics ───

export async function getInventoryAnalytics(db: Database, orgId: string, params: {
  mode: 'low_stock' | 'valuation' | 'top_by_value';
  limit?: number;
}) {
  const { mode } = params;

  if (mode === 'low_stock') {
    const items = await db
      .select({
        id: erpInventory.id,
        sku: erpInventory.sku,
        name: erpInventory.name,
        quantityOnHand: erpInventory.quantityOnHand,
        reorderLevel: erpInventory.reorderLevel,
      })
      .from(erpInventory)
      .where(and(
        eq(erpInventory.orgId, orgId),
        sql`${erpInventory.quantityOnHand} <= ${erpInventory.reorderLevel}`,
      ))
      .orderBy(asc(sql`${erpInventory.quantityOnHand} - ${erpInventory.reorderLevel}`));

    return {
      mode: 'low_stock',
      count: items.length,
      items,
    };
  }

  if (mode === 'valuation') {
    const [result] = await db
      .select({
        totalItems: sql<number>`COUNT(*)::int`,
        totalCostValue: sql<string>`COALESCE(SUM(CAST(${erpInventory.costPrice} AS numeric) * ${erpInventory.quantityOnHand}), 0)`,
        totalRetailValue: sql<string>`COALESCE(SUM(CAST(${erpInventory.unitPrice} AS numeric) * ${erpInventory.quantityOnHand}), 0)`,
        totalUnits: sql<string>`COALESCE(SUM(${erpInventory.quantityOnHand}), 0)`,
      })
      .from(erpInventory)
      .where(eq(erpInventory.orgId, orgId));

    return {
      mode: 'valuation',
      totalItems: result.totalItems,
      totalUnits: parseInt(result.totalUnits) || 0,
      totalCostValue: parseFloat(result.totalCostValue) || 0,
      totalRetailValue: parseFloat(result.totalRetailValue) || 0,
    };
  }

  // top_by_value
  const limit = Math.min(params.limit || 10, 100);
  const items = await db
    .select({
      id: erpInventory.id,
      sku: erpInventory.sku,
      name: erpInventory.name,
      quantityOnHand: erpInventory.quantityOnHand,
      costPrice: erpInventory.costPrice,
      unitPrice: erpInventory.unitPrice,
      costValue: sql<string>`CAST(${erpInventory.costPrice} AS numeric) * ${erpInventory.quantityOnHand}`,
    })
    .from(erpInventory)
    .where(eq(erpInventory.orgId, orgId))
    .orderBy(desc(sql`CAST(${erpInventory.costPrice} AS numeric) * ${erpInventory.quantityOnHand}`))
    .limit(limit);

  return {
    mode: 'top_by_value',
    items: items.map((item, i) => ({
      rank: i + 1,
      id: item.id,
      sku: item.sku,
      name: item.name,
      quantityOnHand: item.quantityOnHand,
      costPrice: parseFloat(item.costPrice) || 0,
      unitPrice: parseFloat(item.unitPrice) || 0,
      costValue: parseFloat(item.costValue) || 0,
    })),
  };
}
