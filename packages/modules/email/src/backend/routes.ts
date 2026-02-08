import { Router } from 'express';
import '@nexus/types';
import { eq, and, desc, count } from 'drizzle-orm';
import { emailAccounts, emails, emailAttachments } from '@nexus/database';
import type { Database } from '@nexus/database';

export function createEmailRouter(db: Database): Router {
  const router = Router();

  // ─── Email Accounts ───
  router.get('/accounts', async (req, res, next) => {
    try {
      const data = await db.select({
        id: emailAccounts.id, emailAddress: emailAccounts.emailAddress,
        provider: emailAccounts.provider, syncStatus: emailAccounts.syncStatus,
        lastSyncAt: emailAccounts.lastSyncAt, createdAt: emailAccounts.createdAt,
      }).from(emailAccounts).where(eq(emailAccounts.orgId, req.orgId!));
      res.json({ success: true, data });
    } catch (e) { next(e); }
  });

  router.post('/accounts', async (req, res, next) => {
    try {
      const [account] = await db.insert(emailAccounts).values({
        orgId: req.orgId!, emailAddress: req.body.emailAddress,
        provider: req.body.provider, credentials: req.body.credentials,
        config: req.body.config || {},
      }).returning();
      res.status(201).json({ success: true, data: { id: account.id, emailAddress: account.emailAddress, provider: account.provider } });
    } catch (e) { next(e); }
  });

  router.delete('/accounts/:id', async (req, res, next) => {
    try {
      await db.delete(emailAccounts).where(and(eq(emailAccounts.id, req.params.id), eq(emailAccounts.orgId, req.orgId!)));
      res.json({ success: true, message: 'Email account removed' });
    } catch (e) { next(e); }
  });

  // ─── Emails ───
  router.get('/emails', async (req, res, next) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 100);
      const offset = (page - 1) * limit;

      const conditions = [eq(emails.orgId, req.orgId!)];
      if (req.query.direction) conditions.push(eq(emails.direction, req.query.direction as string));
      if (req.query.entityType) conditions.push(eq(emails.entityType, req.query.entityType as string));
      if (req.query.entityId) conditions.push(eq(emails.entityId, req.query.entityId as string));
      if (req.query.accountId) conditions.push(eq(emails.emailAccountId, req.query.accountId as string));

      const [totalResult] = await db.select({ count: count() }).from(emails).where(and(...conditions));
      const data = await db.select().from(emails).where(and(...conditions))
        .orderBy(desc(emails.createdAt)).limit(limit).offset(offset);

      res.json({ success: true, data, pagination: { page, limit, total: totalResult.count, totalPages: Math.ceil(totalResult.count / limit) } });
    } catch (e) { next(e); }
  });

  router.get('/emails/:id', async (req, res, next) => {
    try {
      const [email] = await db.select().from(emails)
        .where(and(eq(emails.id, req.params.id), eq(emails.orgId, req.orgId!))).limit(1);
      if (!email) return res.status(404).json({ success: false, error: 'Email not found' });

      const attachments = await db.select().from(emailAttachments).where(eq(emailAttachments.emailId, email.id));
      res.json({ success: true, data: { ...email, attachments } });
    } catch (e) { next(e); }
  });

  // ─── Link email to entity ───
  router.put('/emails/:id/link', async (req, res, next) => {
    try {
      const [email] = await db.update(emails)
        .set({ entityType: req.body.entityType, entityId: req.body.entityId })
        .where(and(eq(emails.id, req.params.id), eq(emails.orgId, req.orgId!))).returning();
      if (!email) return res.status(404).json({ success: false, error: 'Email not found' });
      res.json({ success: true, data: email });
    } catch (e) { next(e); }
  });

  // ─── Send email (creates outbound record) ───
  router.post('/send', async (req, res, next) => {
    try {
      const [email] = await db.insert(emails).values({
        orgId: req.orgId!, emailAccountId: req.body.accountId,
        fromAddress: req.body.from, toAddresses: req.body.to, cc: req.body.cc || [],
        subject: req.body.subject, bodyText: req.body.bodyText, bodyHtml: req.body.bodyHtml,
        direction: 'outbound', status: 'sent', sentAt: new Date(),
        entityType: req.body.entityType, entityId: req.body.entityId,
      }).returning();
      // NOTE: Actual SMTP/API sending would happen here via a service
      res.status(201).json({ success: true, data: email });
    } catch (e) { next(e); }
  });

  return router;
}
