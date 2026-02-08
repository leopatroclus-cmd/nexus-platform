import { eq, and, desc, count } from 'drizzle-orm';
import { crmActivities } from '@nexus/database';
import type { Database } from '@nexus/database';

export async function listActivities(db: Database, orgId: string, params: {
  page?: number; limit?: number; relatedType?: string; relatedId?: string; type?: string;
}) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 25, 100);
  const offset = (page - 1) * limit;

  const conditions = [eq(crmActivities.orgId, orgId)];
  if (params.relatedType) conditions.push(eq(crmActivities.relatedType, params.relatedType));
  if (params.relatedId) conditions.push(eq(crmActivities.relatedId, params.relatedId));
  if (params.type) conditions.push(eq(crmActivities.type, params.type));

  const [totalResult] = await db.select({ count: count() }).from(crmActivities).where(and(...conditions));
  const data = await db.select().from(crmActivities).where(and(...conditions))
    .orderBy(desc(crmActivities.createdAt)).limit(limit).offset(offset);

  return { data, pagination: { page, limit, total: totalResult.count, totalPages: Math.ceil(totalResult.count / limit) } };
}

export async function getActivityById(db: Database, orgId: string, id: string) {
  const [activity] = await db.select().from(crmActivities)
    .where(and(eq(crmActivities.id, id), eq(crmActivities.orgId, orgId))).limit(1);
  return activity || null;
}

export async function createActivity(db: Database, orgId: string, data: any, userId?: string) {
  const [activity] = await db.insert(crmActivities).values({ ...data, orgId, createdBy: userId }).returning();
  return activity;
}

export async function updateActivity(db: Database, orgId: string, id: string, data: any) {
  const [activity] = await db.update(crmActivities).set({ ...data, updatedAt: new Date() })
    .where(and(eq(crmActivities.id, id), eq(crmActivities.orgId, orgId))).returning();
  return activity || null;
}

export async function deleteActivity(db: Database, orgId: string, id: string) {
  await db.delete(crmActivities).where(and(eq(crmActivities.id, id), eq(crmActivities.orgId, orgId)));
}
