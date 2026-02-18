import { db } from '../lib/db.js';
import { sql, eq, and, lt, count, sum } from 'drizzle-orm';
import { crmContacts, crmCompanies, crmDeals, crmDealStages, erpInvoices, erpInventory } from '@nexus/database';

export async function getDashboardStats(orgId: string) {
  // Basic counts
  const [contactsResult] = await db.select({ count: count() }).from(crmContacts).where(eq(crmContacts.orgId, orgId));
  const [companiesResult] = await db.select({ count: count() }).from(crmCompanies).where(eq(crmCompanies.orgId, orgId));
  const [dealsResult] = await db.select({ count: count() }).from(crmDeals).where(eq(crmDeals.orgId, orgId));

  // Deal pipeline value
  const [pipelineValue] = await db.select({ total: sum(crmDeals.value) })
    .from(crmDeals).where(eq(crmDeals.orgId, orgId));

  // Deals by stage
  const dealsByStage = await db
    .select({
      stageName: crmDealStages.name,
      count: count(),
      value: sum(crmDeals.value),
    })
    .from(crmDeals)
    .innerJoin(crmDealStages, eq(crmDeals.stageId, crmDealStages.id))
    .where(eq(crmDeals.orgId, orgId))
    .groupBy(crmDealStages.name);

  // Overdue invoices
  const now = new Date().toISOString().split('T')[0];
  const [overdueInvoices] = await db
    .select({ count: count(), total: sum(erpInvoices.balanceDue) })
    .from(erpInvoices)
    .where(and(
      eq(erpInvoices.orgId, orgId),
      eq(erpInvoices.status, 'sent'),
      sql`${erpInvoices.dueDate} < ${now}`,
    ));

  // Low stock items (below reorder level)
  const lowStockItems = await db
    .select({ id: erpInventory.id, name: erpInventory.name, sku: erpInventory.sku, quantityOnHand: erpInventory.quantityOnHand, reorderLevel: erpInventory.reorderLevel })
    .from(erpInventory)
    .where(and(
      eq(erpInventory.orgId, orgId),
      sql`${erpInventory.quantityOnHand} <= ${erpInventory.reorderLevel}`,
    ))
    .limit(10);

  return {
    counts: {
      contacts: contactsResult.count,
      companies: companiesResult.count,
      deals: dealsResult.count,
    },
    pipelineValue: parseFloat(String(pipelineValue.total || '0')),
    dealsByStage,
    overdueInvoices: {
      count: overdueInvoices.count,
      totalDue: parseFloat(String(overdueInvoices.total || '0')),
    },
    lowStockItems,
  };
}
