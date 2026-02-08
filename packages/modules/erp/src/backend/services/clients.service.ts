import { eq, and, ilike, desc, count } from 'drizzle-orm';
import { erpClients, crmCompanies } from '@nexus/database';
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
