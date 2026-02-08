import { Router } from 'express';
import '@nexus/types';
import { eq, and, desc, count } from 'drizzle-orm';
import { conversations, conversationParticipants, messages } from '@nexus/database';
import type { Database } from '@nexus/database';

type EmitFn = (room: string, event: string, data: unknown) => void;

export function createChatRouter(db: Database, emit?: EmitFn): Router {
  const router = Router();

  // ─── List conversations ───
  router.get('/conversations', async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const offset = (page - 1) * limit;

      const conditions = [eq(conversations.orgId, req.orgId!)];
      if (req.query.entityType) conditions.push(eq(conversations.entityType, req.query.entityType as string));
      if (req.query.entityId) conditions.push(eq(conversations.entityId, req.query.entityId as string));

      const [totalResult] = await db.select({ count: count() }).from(conversations).where(and(...conditions));
      const data = await db.select().from(conversations).where(and(...conditions))
        .orderBy(desc(conversations.lastMessageAt)).limit(limit).offset(offset);

      res.json({ success: true, data, pagination: { page, limit, total: totalResult.count, totalPages: Math.ceil(totalResult.count / limit) } });
    } catch (e) { next(e); }
  });

  // ─── Get conversation with messages ───
  router.get('/conversations/:id', async (req, res, next) => {
    try {
      const [conv] = await db.select().from(conversations)
        .where(and(eq(conversations.id, req.params.id as string), eq(conversations.orgId, req.orgId!))).limit(1);
      if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });

      const msgs = await db.select().from(messages)
        .where(eq(messages.conversationId, conv.id)).orderBy(messages.createdAt);
      const participants = await db.select().from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conv.id));

      res.json({ success: true, data: { ...conv, messages: msgs, participants } });
    } catch (e) { next(e); }
  });

  // ─── Create conversation ───
  router.post('/conversations', async (req, res, next) => {
    try {
      const senderId = req.userId || req.agentId!;
      const [conv] = await db.insert(conversations).values({
        orgId: req.orgId!, title: req.body.title,
        type: req.body.type || 'general', entityType: req.body.entityType,
        entityId: req.body.entityId, createdBy: senderId,
      }).returning();

      await db.insert(conversationParticipants).values({
        conversationId: conv.id,
        participantType: req.isAgent ? 'agent' : 'user',
        participantId: senderId,
      });

      res.status(201).json({ success: true, data: conv });
    } catch (e) { next(e); }
  });

  // ─── Update conversation status ───
  router.put('/conversations/:id', async (req, res, next) => {
    try {
      const [conv] = await db.update(conversations)
        .set({ status: req.body.status, title: req.body.title, updatedAt: new Date() })
        .where(and(eq(conversations.id, req.params.id as string), eq(conversations.orgId, req.orgId!))).returning();
      if (!conv) return res.status(404).json({ success: false, error: 'Conversation not found' });
      res.json({ success: true, data: conv });
    } catch (e) { next(e); }
  });

  // ─── Get messages ───
  router.get('/conversations/:id/messages', async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = (page - 1) * limit;

      const data = await db.select().from(messages)
        .where(and(eq(messages.conversationId, req.params.id as string), eq(messages.orgId, req.orgId!)))
        .orderBy(desc(messages.createdAt)).limit(limit).offset(offset);

      res.json({ success: true, data: data.reverse() });
    } catch (e) { next(e); }
  });

  // ─── Send message ───
  router.post('/conversations/:id/messages', async (req, res, next) => {
    try {
      const senderId = req.userId || req.agentId!;
      const senderType = req.isAgent ? 'agent' : 'user';

      const [msg] = await db.insert(messages).values({
        orgId: req.orgId!, conversationId: req.params.id as string,
        senderType, senderId, content: req.body.content,
        contentType: req.body.contentType || 'text', metadata: req.body.metadata,
      }).returning();

      // Update last message time
      await db.update(conversations).set({ lastMessageAt: new Date(), updatedAt: new Date() })
        .where(eq(conversations.id, req.params.id as string));

      // Ensure sender is participant
      const [existing] = await db.select().from(conversationParticipants)
        .where(and(
          eq(conversationParticipants.conversationId, req.params.id as string),
          eq(conversationParticipants.participantId, senderId),
        )).limit(1);
      if (!existing) {
        await db.insert(conversationParticipants).values({
          conversationId: req.params.id as string, participantType: senderType, participantId: senderId,
        });
      }

      // Emit real-time event
      if (emit) {
        emit(`conv:${req.params.id}`, 'new-message', msg);
        emit(`org:${req.orgId}`, 'conversation-updated', { conversationId: req.params.id, lastMessage: msg });
      }

      res.status(201).json({ success: true, data: msg });
    } catch (e) { next(e); }
  });

  // ─── Get or create entity thread ───
  router.post('/entity-thread', async (req, res, next) => {
    try {
      const { entityType, entityId } = req.body;
      const [existing] = await db.select().from(conversations)
        .where(and(
          eq(conversations.orgId, req.orgId!),
          eq(conversations.entityType, entityType),
          eq(conversations.entityId, entityId),
          eq(conversations.type, 'entity_thread'),
        )).limit(1);

      if (existing) {
        return res.json({ success: true, data: existing });
      }

      const senderId = req.userId || req.agentId!;
      const [conv] = await db.insert(conversations).values({
        orgId: req.orgId!, type: 'entity_thread',
        entityType, entityId, createdBy: senderId,
      }).returning();

      await db.insert(conversationParticipants).values({
        conversationId: conv.id, participantType: req.isAgent ? 'agent' : 'user', participantId: senderId,
      });

      res.status(201).json({ success: true, data: conv });
    } catch (e) { next(e); }
  });

  return router;
}
