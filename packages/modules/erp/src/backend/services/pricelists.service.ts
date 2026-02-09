import { eq, and, ilike, desc, count } from 'drizzle-orm';
import { erpPricelists, erpPricelistItems, erpClients, erpInventory } from '@nexus/database';
import type { Database } from '@nexus/database';

export async function listPricelists(db: Database, orgId: string, params: {
  page?: number; limit?: number; search?: string;
}) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 25, 100);
  const offset = (page - 1) * limit;

  const conditions = [eq(erpPricelists.orgId, orgId)];
  if (params.search) conditions.push(ilike(erpPricelists.name, `%${params.search}%`));

  const [totalResult] = await db.select({ count: count() }).from(erpPricelists).where(and(...conditions));
  const data = await db.select().from(erpPricelists).where(and(...conditions))
    .orderBy(desc(erpPricelists.createdAt)).limit(limit).offset(offset);

  // Attach item counts
  const enriched = await Promise.all(data.map(async (pl) => {
    const [itemCount] = await db.select({ count: count() }).from(erpPricelistItems)
      .where(eq(erpPricelistItems.pricelistId, pl.id));
    return { ...pl, itemCount: itemCount.count };
  }));

  return { data: enriched, pagination: { page, limit, total: totalResult.count, totalPages: Math.ceil(totalResult.count / limit) } };
}

export async function getPricelistById(db: Database, orgId: string, id: string) {
  const [pricelist] = await db.select().from(erpPricelists)
    .where(and(eq(erpPricelists.id, id), eq(erpPricelists.orgId, orgId))).limit(1);
  if (!pricelist) return null;

  const items = await db
    .select({
      id: erpPricelistItems.id,
      pricelistId: erpPricelistItems.pricelistId,
      inventoryId: erpPricelistItems.inventoryId,
      price: erpPricelistItems.price,
      minQuantity: erpPricelistItems.minQuantity,
      inventoryName: erpInventory.name,
      inventorySku: erpInventory.sku,
      inventoryUnitPrice: erpInventory.unitPrice,
    })
    .from(erpPricelistItems)
    .leftJoin(erpInventory, eq(erpPricelistItems.inventoryId, erpInventory.id))
    .where(eq(erpPricelistItems.pricelistId, id));

  return { ...pricelist, items };
}

export async function createPricelist(db: Database, orgId: string, data: any) {
  const [pricelist] = await db.insert(erpPricelists).values({
    orgId,
    name: data.name,
    description: data.description,
    currency: data.currency || 'USD',
    isActive: data.isActive ?? true,
  }).returning();
  return pricelist;
}

export async function updatePricelist(db: Database, orgId: string, id: string, data: any) {
  const updateData: any = { updatedAt: new Date() };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.currency !== undefined) updateData.currency = data.currency;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const [pricelist] = await db.update(erpPricelists).set(updateData)
    .where(and(eq(erpPricelists.id, id), eq(erpPricelists.orgId, orgId))).returning();
  if (!pricelist) return null;

  if (data.items) {
    await setPricelistItems(db, id, data.items);
  }

  return getPricelistById(db, orgId, id);
}

export async function deletePricelist(db: Database, orgId: string, id: string) {
  await db.delete(erpPricelists).where(and(eq(erpPricelists.id, id), eq(erpPricelists.orgId, orgId)));
}

export async function setPricelistItems(db: Database, pricelistId: string, items: { inventoryId: string; price: string | number; minQuantity?: string | number }[]) {
  await db.delete(erpPricelistItems).where(eq(erpPricelistItems.pricelistId, pricelistId));
  if (items.length === 0) return [];
  const rows = items.map((item) => ({
    pricelistId,
    inventoryId: item.inventoryId,
    price: String(item.price),
    minQuantity: String(item.minQuantity ?? 1),
  }));
  return db.insert(erpPricelistItems).values(rows).returning();
}

export async function resolvePriceForClient(db: Database, orgId: string, clientId: string, inventoryId: string) {
  const [client] = await db.select({ pricelistId: erpClients.pricelistId })
    .from(erpClients)
    .where(and(eq(erpClients.id, clientId), eq(erpClients.orgId, orgId)))
    .limit(1);
  if (!client?.pricelistId) return null;

  const [item] = await db.select({ price: erpPricelistItems.price })
    .from(erpPricelistItems)
    .where(and(
      eq(erpPricelistItems.pricelistId, client.pricelistId),
      eq(erpPricelistItems.inventoryId, inventoryId),
    ))
    .limit(1);

  return item?.price ?? null;
}
