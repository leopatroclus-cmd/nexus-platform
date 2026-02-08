import { Router } from 'express';
import '@nexus/types';
import { eq, and, desc, count } from 'drizzle-orm';
import crypto from 'crypto';
import { agents, agentPermissions, agentTools, agentActionsLog, permissions } from '@nexus/database';
import type { Database } from '@nexus/database';
import { AGENT_API_KEY_PREFIX } from '@nexus/utils';

export function createAgentsRouter(db: Database): Router {
  const router = Router();

  // ─── List agents ───
  router.get('/', async (req, res, next) => {
    try {
      const data = await db.select().from(agents).where(eq(agents.orgId, req.orgId!)).orderBy(desc(agents.createdAt));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  });

  // ─── Get agent ───
  router.get('/:id', async (req, res, next) => {
    try {
      const [agent] = await db.select().from(agents)
        .where(and(eq(agents.id, req.params.id), eq(agents.orgId, req.orgId!))).limit(1);
      if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });

      const perms = await db.select({ code: permissions.code }).from(agentPermissions)
        .innerJoin(permissions, eq(agentPermissions.permissionId, permissions.id))
        .where(eq(agentPermissions.agentId, agent.id));
      const tools = await db.select().from(agentTools).where(eq(agentTools.agentId, agent.id));

      res.json({ success: true, data: { ...agent, permissions: perms, tools } });
    } catch (e) { next(e); }
  });

  // ─── Create agent (returns API key once) ───
  router.post('/', async (req, res, next) => {
    try {
      const rawKey = AGENT_API_KEY_PREFIX + crypto.randomBytes(32).toString('hex');
      const apiKeyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

      const [agent] = await db.insert(agents).values({
        orgId: req.orgId!, name: req.body.name, description: req.body.description,
        type: req.body.type || 'assistant', apiKeyHash, config: req.body.config || {},
      }).returning();

      res.status(201).json({ success: true, data: { ...agent, apiKey: rawKey } });
    } catch (e) { next(e); }
  });

  // ─── Update agent ───
  router.put('/:id', async (req, res, next) => {
    try {
      const { name, description, status, config } = req.body;
      const [agent] = await db.update(agents).set({ name, description, status, config, updatedAt: new Date() })
        .where(and(eq(agents.id, req.params.id), eq(agents.orgId, req.orgId!))).returning();
      if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
      res.json({ success: true, data: agent });
    } catch (e) { next(e); }
  });

  // ─── Regenerate API key ───
  router.post('/:id/regenerate-key', async (req, res, next) => {
    try {
      const rawKey = AGENT_API_KEY_PREFIX + crypto.randomBytes(32).toString('hex');
      const apiKeyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

      const [agent] = await db.update(agents).set({ apiKeyHash, updatedAt: new Date() })
        .where(and(eq(agents.id, req.params.id), eq(agents.orgId, req.orgId!))).returning();
      if (!agent) return res.status(404).json({ success: false, error: 'Agent not found' });
      res.json({ success: true, data: { ...agent, apiKey: rawKey } });
    } catch (e) { next(e); }
  });

  // ─── Delete agent ───
  router.delete('/:id', async (req, res, next) => {
    try {
      await db.delete(agents).where(and(eq(agents.id, req.params.id), eq(agents.orgId, req.orgId!)));
      res.json({ success: true, message: 'Agent deleted' });
    } catch (e) { next(e); }
  });

  // ─── Set agent permissions ───
  router.put('/:id/permissions', async (req, res, next) => {
    try {
      const agentId = req.params.id;
      await db.delete(agentPermissions).where(eq(agentPermissions.agentId, agentId));
      if (req.body.permissionIds?.length) {
        await db.insert(agentPermissions).values(
          req.body.permissionIds.map((permissionId: string) => ({ agentId, permissionId })),
        );
      }
      res.json({ success: true, message: 'Permissions updated' });
    } catch (e) { next(e); }
  });

  // ─── Set agent tools ───
  router.put('/:id/tools', async (req, res, next) => {
    try {
      const agentId = req.params.id;
      await db.delete(agentTools).where(eq(agentTools.agentId, agentId));
      if (req.body.tools?.length) {
        await db.insert(agentTools).values(
          req.body.tools.map((t: { toolKey: string; config?: any }) => ({ agentId, toolKey: t.toolKey, config: t.config || {} })),
        );
      }
      res.json({ success: true, message: 'Tools updated' });
    } catch (e) { next(e); }
  });

  // ─── Action log ───
  router.get('/:id/actions', async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const offset = (page - 1) * limit;

      const [totalResult] = await db.select({ count: count() }).from(agentActionsLog)
        .where(and(eq(agentActionsLog.agentId, req.params.id), eq(agentActionsLog.orgId, req.orgId!)));
      const data = await db.select().from(agentActionsLog)
        .where(and(eq(agentActionsLog.agentId, req.params.id), eq(agentActionsLog.orgId, req.orgId!)))
        .orderBy(desc(agentActionsLog.createdAt)).limit(limit).offset(offset);

      res.json({ success: true, data, pagination: { page, limit, total: totalResult.count, totalPages: Math.ceil(totalResult.count / limit) } });
    } catch (e) { next(e); }
  });

  // ─── Approve/reject action ───
  router.post('/actions/:actionId/approve', async (req, res, next) => {
    try {
      const [action] = await db.update(agentActionsLog)
        .set({ status: 'success', approvedBy: req.userId })
        .where(and(eq(agentActionsLog.id, req.params.actionId), eq(agentActionsLog.orgId, req.orgId!), eq(agentActionsLog.status, 'pending_approval')))
        .returning();
      if (!action) return res.status(404).json({ success: false, error: 'Action not found or not pending' });
      res.json({ success: true, data: action });
    } catch (e) { next(e); }
  });

  router.post('/actions/:actionId/reject', async (req, res, next) => {
    try {
      const [action] = await db.update(agentActionsLog)
        .set({ status: 'failed', approvedBy: req.userId, output: { rejected: true, reason: req.body.reason } })
        .where(and(eq(agentActionsLog.id, req.params.actionId), eq(agentActionsLog.orgId, req.orgId!), eq(agentActionsLog.status, 'pending_approval')))
        .returning();
      if (!action) return res.status(404).json({ success: false, error: 'Action not found or not pending' });
      res.json({ success: true, data: action });
    } catch (e) { next(e); }
  });

  return router;
}
