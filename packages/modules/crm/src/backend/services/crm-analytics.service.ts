import { eq, and, sql, gte, lte } from 'drizzle-orm';
import { crmDeals, crmDealStages } from '@nexus/database';
import type { Database } from '@nexus/database';

export async function getDealPipelineAnalytics(db: Database, orgId: string, params: {
  pipelineName?: string;
  ownerId?: string;
  expectedCloseStart?: string;
  expectedCloseEnd?: string;
  includeWon?: boolean;
  includeLost?: boolean;
}) {
  const dealConditions = [eq(crmDeals.orgId, orgId)];
  if (params.ownerId) dealConditions.push(eq(crmDeals.ownerId, params.ownerId));
  if (params.expectedCloseStart) dealConditions.push(gte(crmDeals.expectedClose, new Date(params.expectedCloseStart)));
  if (params.expectedCloseEnd) dealConditions.push(lte(crmDeals.expectedClose, new Date(params.expectedCloseEnd)));

  const stageConditions = [eq(crmDealStages.orgId, orgId)];
  if (params.pipelineName) stageConditions.push(eq(crmDealStages.pipelineName, params.pipelineName));
  if (params.includeWon === false) stageConditions.push(eq(crmDealStages.isWon, false));
  if (params.includeLost === false) stageConditions.push(eq(crmDealStages.isLost, false));

  const results = await db
    .select({
      stageId: crmDealStages.id,
      stageName: crmDealStages.name,
      pipelineName: crmDealStages.pipelineName,
      displayOrder: crmDealStages.displayOrder,
      probability: crmDealStages.probability,
      isWon: crmDealStages.isWon,
      isLost: crmDealStages.isLost,
      dealCount: sql<number>`COUNT(${crmDeals.id})::int`,
      totalValue: sql<string>`COALESCE(SUM(CAST(${crmDeals.value} AS numeric)), 0)`,
      weightedValue: sql<string>`COALESCE(SUM(CAST(${crmDeals.value} AS numeric) * ${crmDealStages.probability} / 100), 0)`,
    })
    .from(crmDealStages)
    .leftJoin(crmDeals, and(
      eq(crmDeals.stageId, crmDealStages.id),
      ...dealConditions,
    ))
    .where(and(...stageConditions))
    .groupBy(
      crmDealStages.id,
      crmDealStages.name,
      crmDealStages.pipelineName,
      crmDealStages.displayOrder,
      crmDealStages.probability,
      crmDealStages.isWon,
      crmDealStages.isLost,
    )
    .orderBy(crmDealStages.displayOrder);

  const stages = results.map((r) => ({
    stageId: r.stageId,
    stageName: r.stageName,
    pipelineName: r.pipelineName,
    displayOrder: r.displayOrder,
    probability: r.probability,
    isWon: r.isWon,
    isLost: r.isLost,
    dealCount: r.dealCount,
    totalValue: parseFloat(r.totalValue) || 0,
    weightedValue: parseFloat(r.weightedValue) || 0,
  }));

  const totals = stages.reduce(
    (acc, s) => ({
      totalDeals: acc.totalDeals + s.dealCount,
      totalValue: acc.totalValue + s.totalValue,
      totalWeightedValue: acc.totalWeightedValue + s.weightedValue,
    }),
    { totalDeals: 0, totalValue: 0, totalWeightedValue: 0 },
  );

  return {
    stages,
    totals: {
      totalDeals: totals.totalDeals,
      totalValue: Math.round(totals.totalValue * 100) / 100,
      totalWeightedValue: Math.round(totals.totalWeightedValue * 100) / 100,
    },
  };
}
