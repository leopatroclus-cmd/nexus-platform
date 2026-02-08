import { eq, and, desc, count } from 'drizzle-orm';
import { crmNotes } from '@nexus/database';
import type { Database } from '@nexus/database';

export async function listNotes(db: Database, orgId: string, params: {
  page?: number; limit?: number; relatedType?: string; relatedId?: string;
}) {
  const page = params.page || 1;
  const limit = Math.min(params.limit || 25, 100);
  const offset = (page - 1) * limit;

  const conditions = [eq(crmNotes.orgId, orgId)];
  if (params.relatedType) conditions.push(eq(crmNotes.relatedType, params.relatedType));
  if (params.relatedId) conditions.push(eq(crmNotes.relatedId, params.relatedId));

  const [totalResult] = await db.select({ count: count() }).from(crmNotes).where(and(...conditions));
  const data = await db.select().from(crmNotes).where(and(...conditions))
    .orderBy(desc(crmNotes.createdAt)).limit(limit).offset(offset);

  return { data, pagination: { page, limit, total: totalResult.count, totalPages: Math.ceil(totalResult.count / limit) } };
}

export async function createNote(db: Database, orgId: string, data: any, userId?: string) {
  const [note] = await db.insert(crmNotes).values({ ...data, orgId, createdBy: userId }).returning();
  return note;
}

export async function updateNote(db: Database, orgId: string, id: string, data: any) {
  const [note] = await db.update(crmNotes).set({ ...data, updatedAt: new Date() })
    .where(and(eq(crmNotes.id, id), eq(crmNotes.orgId, orgId))).returning();
  return note || null;
}

export async function deleteNote(db: Database, orgId: string, id: string) {
  await db.delete(crmNotes).where(and(eq(crmNotes.id, id), eq(crmNotes.orgId, orgId)));
}
