import { eq, and, desc, count } from 'drizzle-orm';
import { crmDeals, crmDealStages } from '@nexus/database';
import type { Database } from '@nexus/database';

export async function listDeals(db: Database, orgId: string, params: {
  page?: number; limit?: number; stageId?: string;
}) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 25, 100);
  const offset = (page - 1) * limit;

  const conditions = [eq(crmDeals.orgId, orgId)];
  if (params.stageId) conditions.push(eq(crmDeals.stageId, params.stageId));

  const [totalResult] = await db.select({ count: count() }).from(crmDeals).where(and(...conditions));
  const data = await db.select().from(crmDeals).where(and(...conditions))
    .orderBy(desc(crmDeals.createdAt)).limit(limit).offset(offset);

  return { data, pagination: { page, limit, total: totalResult.count, totalPages: Math.ceil(totalResult.count / limit) } };
}

export async function getDealById(db: Database, orgId: string, id: string) {
  const [deal] = await db.select().from(crmDeals)
    .where(and(eq(crmDeals.id, id), eq(crmDeals.orgId, orgId))).limit(1);
  return deal || null;
}

export async function createDeal(db: Database, orgId: string, data: any) {
  const [deal] = await db.insert(crmDeals).values({ ...data, orgId }).returning();
  return deal;
}

export async function updateDeal(db: Database, orgId: string, id: string, data: any) {
  const [deal] = await db.update(crmDeals).set({ ...data, updatedAt: new Date() })
    .where(and(eq(crmDeals.id, id), eq(crmDeals.orgId, orgId))).returning();
  return deal || null;
}

export async function moveStage(db: Database, orgId: string, dealId: string, stageId: string) {
  const [stage] = await db.select().from(crmDealStages)
    .where(and(eq(crmDealStages.id, stageId), eq(crmDealStages.orgId, orgId))).limit(1);
  if (!stage) return null;

  const [deal] = await db.update(crmDeals).set({ stageId, updatedAt: new Date() })
    .where(and(eq(crmDeals.id, dealId), eq(crmDeals.orgId, orgId))).returning();
  return deal || null;
}

export async function deleteDeal(db: Database, orgId: string, id: string) {
  await db.delete(crmDeals).where(and(eq(crmDeals.id, id), eq(crmDeals.orgId, orgId)));
}
