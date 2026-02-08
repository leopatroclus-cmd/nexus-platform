import { eq, and, asc } from 'drizzle-orm';
import { crmDealStages } from '@nexus/database';
import type { Database } from '@nexus/database';

export async function listDealStages(db: Database, orgId: string) {
  return db.select().from(crmDealStages).where(eq(crmDealStages.orgId, orgId))
    .orderBy(asc(crmDealStages.displayOrder));
}

export async function createDealStage(db: Database, orgId: string, data: any) {
  const [stage] = await db.insert(crmDealStages).values({ ...data, orgId }).returning();
  return stage;
}

export async function updateDealStage(db: Database, orgId: string, id: string, data: any) {
  const [stage] = await db.update(crmDealStages).set(data)
    .where(and(eq(crmDealStages.id, id), eq(crmDealStages.orgId, orgId))).returning();
  return stage || null;
}

export async function deleteDealStage(db: Database, orgId: string, id: string) {
  await db.delete(crmDealStages).where(and(eq(crmDealStages.id, id), eq(crmDealStages.orgId, orgId)));
}

export async function reorderDealStages(db: Database, orgId: string, stageIds: string[]) {
  for (let i = 0; i < stageIds.length; i++) {
    await db.update(crmDealStages).set({ displayOrder: i })
      .where(and(eq(crmDealStages.id, stageIds[i]), eq(crmDealStages.orgId, orgId)));
  }
}

export async function seedDealStages(db: Database, orgId: string) {
  const existing = await db.select().from(crmDealStages).where(eq(crmDealStages.orgId, orgId)).limit(1);
  if (existing.length > 0) return;

  await db.insert(crmDealStages).values([
    { orgId, pipelineName: 'Default', name: 'Lead', displayOrder: 0, probability: 0, isWon: false, isLost: false },
    { orgId, pipelineName: 'Default', name: 'Qualified', displayOrder: 1, probability: 25, isWon: false, isLost: false },
    { orgId, pipelineName: 'Default', name: 'Proposal', displayOrder: 2, probability: 50, isWon: false, isLost: false },
    { orgId, pipelineName: 'Default', name: 'Negotiation', displayOrder: 3, probability: 75, isWon: false, isLost: false },
    { orgId, pipelineName: 'Default', name: 'Won', displayOrder: 4, probability: 100, isWon: true, isLost: false },
    { orgId, pipelineName: 'Default', name: 'Lost', displayOrder: 5, probability: 0, isWon: false, isLost: true },
  ]);
}
