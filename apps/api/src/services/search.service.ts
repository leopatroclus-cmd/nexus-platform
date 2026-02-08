import { db } from '../lib/db.js';
import { sql, or, ilike } from 'drizzle-orm';
import { crmContacts, crmCompanies, crmDeals, erpClients, erpInventory, erpOrders, erpInvoices } from '@nexus/database';

interface SearchResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  path: string;
}

export async function globalSearch(orgId: string, query: string, limit = 10): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  const pattern = `%${query}%`;
  const results: SearchResult[] = [];

  // Search contacts
  const contacts = await db.select({ id: crmContacts.id, firstName: crmContacts.firstName, lastName: crmContacts.lastName, email: crmContacts.email })
    .from(crmContacts)
    .where(sql`${crmContacts.orgId} = ${orgId} AND (${crmContacts.firstName} ILIKE ${pattern} OR ${crmContacts.lastName} ILIKE ${pattern} OR ${crmContacts.email} ILIKE ${pattern})`)
    .limit(limit);
  for (const c of contacts) {
    results.push({ id: c.id, type: 'contact', title: `${c.firstName} ${c.lastName}`, subtitle: c.email || undefined, path: `/crm/contacts/${c.id}` });
  }

  // Search companies
  const companies = await db.select({ id: crmCompanies.id, name: crmCompanies.name, domain: crmCompanies.domain })
    .from(crmCompanies)
    .where(sql`${crmCompanies.orgId} = ${orgId} AND (${crmCompanies.name} ILIKE ${pattern} OR ${crmCompanies.domain} ILIKE ${pattern})`)
    .limit(limit);
  for (const c of companies) {
    results.push({ id: c.id, type: 'company', title: c.name, subtitle: c.domain || undefined, path: `/crm/companies/${c.id}` });
  }

  // Search deals
  const deals = await db.select({ id: crmDeals.id, title: crmDeals.title })
    .from(crmDeals)
    .where(sql`${crmDeals.orgId} = ${orgId} AND ${crmDeals.title} ILIKE ${pattern}`)
    .limit(limit);
  for (const d of deals) {
    results.push({ id: d.id, type: 'deal', title: d.title, path: `/crm/deals` });
  }

  // Search ERP clients
  const clients = await db.select({ id: erpClients.id, name: erpClients.name, type: erpClients.type })
    .from(erpClients)
    .where(sql`${erpClients.orgId} = ${orgId} AND ${erpClients.name} ILIKE ${pattern}`)
    .limit(limit);
  for (const c of clients) {
    results.push({ id: c.id, type: 'client', title: c.name, subtitle: c.type || undefined, path: `/erp/clients` });
  }

  // Search inventory
  const inventory = await db.select({ id: erpInventory.id, name: erpInventory.name, sku: erpInventory.sku })
    .from(erpInventory)
    .where(sql`${erpInventory.orgId} = ${orgId} AND (${erpInventory.name} ILIKE ${pattern} OR ${erpInventory.sku} ILIKE ${pattern})`)
    .limit(limit);
  for (const i of inventory) {
    results.push({ id: i.id, type: 'inventory', title: i.name, subtitle: i.sku || undefined, path: `/erp/inventory` });
  }

  // Search invoices by number
  const invoices = await db.select({ id: erpInvoices.id, invoiceNumber: erpInvoices.invoiceNumber, status: erpInvoices.status })
    .from(erpInvoices)
    .where(sql`${erpInvoices.orgId} = ${orgId} AND ${erpInvoices.invoiceNumber} ILIKE ${pattern}`)
    .limit(limit);
  for (const inv of invoices) {
    results.push({ id: inv.id, type: 'invoice', title: inv.invoiceNumber || inv.id, subtitle: inv.status || undefined, path: `/erp/invoices/${inv.id}` });
  }

  // Search orders by number
  const orders = await db.select({ id: erpOrders.id, orderNumber: erpOrders.orderNumber, status: erpOrders.status })
    .from(erpOrders)
    .where(sql`${erpOrders.orgId} = ${orgId} AND ${erpOrders.orderNumber} ILIKE ${pattern}`)
    .limit(limit);
  for (const o of orders) {
    results.push({ id: o.id, type: 'order', title: o.orderNumber || o.id, subtitle: o.status || undefined, path: `/erp/orders/${o.id}` });
  }

  return results.slice(0, limit);
}
