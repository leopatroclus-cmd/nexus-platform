import { eq, and, ilike, desc, asc, count } from 'drizzle-orm';
import { crmCompanies } from '@nexus/database';
import type { Database } from '@nexus/database';

export async function listCompanies(db: Database, orgId: string, params: {
  page?: number; limit?: number; sort?: string; search?: string;
}) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 25, 100);
  const offset = (page - 1) * limit;

  let query = db.select().from(crmCompanies).where(eq(crmCompanies.orgId, orgId)).$dynamic();

  if (params.search) {
    query = query.where(and(eq(crmCompanies.orgId, orgId), ilike(crmCompanies.name, `%${params.search}%`))) as any;
  }

  query = query.orderBy(desc(crmCompanies.createdAt)) as any;
  const [totalResult] = await db.select({ count: count() }).from(crmCompanies).where(eq(crmCompanies.orgId, orgId));
  const data = await query.limit(limit).offset(offset);

  return { data, pagination: { page, limit, total: totalResult.count, totalPages: Math.ceil(totalResult.count / limit) } };
}

export async function getCompanyById(db: Database, orgId: string, id: string) {
  const [company] = await db.select().from(crmCompanies)
    .where(and(eq(crmCompanies.id, id), eq(crmCompanies.orgId, orgId))).limit(1);
  return company || null;
}

export async function createCompany(db: Database, orgId: string, data: any) {
  const [company] = await db.insert(crmCompanies).values({ ...data, orgId }).returning();
  return company;
}

export async function updateCompany(db: Database, orgId: string, id: string, data: any) {
  const [company] = await db.update(crmCompanies).set({ ...data, updatedAt: new Date() })
    .where(and(eq(crmCompanies.id, id), eq(crmCompanies.orgId, orgId))).returning();
  return company || null;
}

export async function deleteCompany(db: Database, orgId: string, id: string) {
  await db.delete(crmCompanies).where(and(eq(crmCompanies.id, id), eq(crmCompanies.orgId, orgId)));
}
