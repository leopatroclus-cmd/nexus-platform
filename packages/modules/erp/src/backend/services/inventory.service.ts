import { eq, and, ilike, desc, count, sql } from 'drizzle-orm';
import { erpInventory } from '@nexus/database';
import type { Database } from '@nexus/database';

export async function listInventory(db: Database, orgId: string, params: {
  page?: number; limit?: number; search?: string; type?: string;
}) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 25, 100);
  const offset = (page - 1) * limit;

  const conditions = [eq(erpInventory.orgId, orgId)];
  if (params.search) conditions.push(ilike(erpInventory.name, `%${params.search}%`));
  if (params.type) conditions.push(eq(erpInventory.type, params.type));

  const [totalResult] = await db.select({ count: count() }).from(erpInventory).where(and(...conditions));
  const data = await db.select().from(erpInventory).where(and(...conditions))
    .orderBy(desc(erpInventory.createdAt)).limit(limit).offset(offset);

  return { data, pagination: { page, limit, total: totalResult.count, totalPages: Math.ceil(totalResult.count / limit) } };
}

export async function getItemById(db: Database, orgId: string, id: string) {
  const [item] = await db.select().from(erpInventory)
    .where(and(eq(erpInventory.id, id), eq(erpInventory.orgId, orgId))).limit(1);
  return item || null;
}

export async function createItem(db: Database, orgId: string, data: any) {
  const [item] = await db.insert(erpInventory).values({ ...data, orgId }).returning();
  return item;
}

export async function updateItem(db: Database, orgId: string, id: string, data: any) {
  const [item] = await db.update(erpInventory).set({ ...data, updatedAt: new Date() })
    .where(and(eq(erpInventory.id, id), eq(erpInventory.orgId, orgId))).returning();
  return item || null;
}

export async function deleteItem(db: Database, orgId: string, id: string) {
  await db.delete(erpInventory).where(and(eq(erpInventory.id, id), eq(erpInventory.orgId, orgId)));
}

export async function adjustStock(db: Database, orgId: string, id: string, quantityDelta: number) {
  const [item] = await db.update(erpInventory)
    .set({ quantityOnHand: sql`${erpInventory.quantityOnHand} + ${quantityDelta}`, updatedAt: new Date() })
    .where(and(eq(erpInventory.id, id), eq(erpInventory.orgId, orgId))).returning();
  return item || null;
}
