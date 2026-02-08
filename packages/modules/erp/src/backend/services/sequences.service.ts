import { eq, and, sql } from 'drizzle-orm';
import { orgSequences } from '@nexus/database';
import type { Database } from '@nexus/database';

export async function getNextNumber(db: Database, orgId: string, entityType: string, prefix: string): Promise<string> {
  const [existing] = await db.select().from(orgSequences)
    .where(and(eq(orgSequences.orgId, orgId), eq(orgSequences.entityType, entityType))).limit(1);

  let nextVal: number;

  if (existing) {
    nextVal = existing.currentValue + 1;
    await db.update(orgSequences).set({ currentValue: nextVal })
      .where(eq(orgSequences.id, existing.id));
  } else {
    nextVal = 1;
    await db.insert(orgSequences).values({ orgId, entityType, prefix, currentValue: nextVal });
  }

  return `${prefix}${String(nextVal).padStart(4, '0')}`;
}
