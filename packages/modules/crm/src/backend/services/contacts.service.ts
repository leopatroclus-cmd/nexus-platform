import { eq, and, or, ilike, desc, asc, sql, count } from 'drizzle-orm';
import { crmContacts, crmCompanies } from '@nexus/database';
import type { Database } from '@nexus/database';

export async function listContacts(db: Database, orgId: string, params: {
  page?: number; limit?: number; sort?: string; search?: string;
  filter?: Record<string, string>;
}) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 25, 100);
  const offset = (page - 1) * limit;

  let query = db.select().from(crmContacts).where(eq(crmContacts.orgId, orgId)).$dynamic();

  if (params.search) {
    const s = `%${params.search}%`;
    query = query.where(and(eq(crmContacts.orgId, orgId), or(
      ilike(crmContacts.firstName, s), ilike(crmContacts.lastName, s), ilike(crmContacts.email, s),
    ))) as any;
  }

  if (params.filter?.status) {
    query = query.where(and(eq(crmContacts.orgId, orgId), eq(crmContacts.status, params.filter.status))) as any;
  }

  if (params.filter?.companyId) {
    query = query.where(and(eq(crmContacts.orgId, orgId), eq(crmContacts.companyId, params.filter.companyId))) as any;
  }

  const orderCol = params.sort?.startsWith('-') ? params.sort.slice(1) : params.sort;
  const orderDir = params.sort?.startsWith('-') ? desc : asc;
  if (orderCol === 'name') {
    query = query.orderBy(orderDir(crmContacts.firstName)) as any;
  } else {
    query = query.orderBy(desc(crmContacts.createdAt)) as any;
  }

  const [totalResult] = await db.select({ count: count() }).from(crmContacts).where(eq(crmContacts.orgId, orgId));
  const total = totalResult.count;
  const data = await query.limit(limit).offset(offset);

  return { data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getContactById(db: Database, orgId: string, id: string) {
  const [contact] = await db.select().from(crmContacts)
    .where(and(eq(crmContacts.id, id), eq(crmContacts.orgId, orgId))).limit(1);
  return contact || null;
}

export async function createContact(db: Database, orgId: string, data: any) {
  const [contact] = await db.insert(crmContacts).values({ ...data, orgId }).returning();
  return contact;
}

export async function updateContact(db: Database, orgId: string, id: string, data: any) {
  const [contact] = await db.update(crmContacts).set({ ...data, updatedAt: new Date() })
    .where(and(eq(crmContacts.id, id), eq(crmContacts.orgId, orgId))).returning();
  return contact || null;
}

export async function deleteContact(db: Database, orgId: string, id: string) {
  await db.delete(crmContacts).where(and(eq(crmContacts.id, id), eq(crmContacts.orgId, orgId)));
}
