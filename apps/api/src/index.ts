import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

import { env } from './env.js';
import { db } from './lib/db.js';
import { errorHandler } from './middleware/error-handler.js';
import { authMiddleware } from './middleware/auth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { moduleGuard } from './middleware/module-guard.js';
import { registry } from './lib/module-registry.js';
import { initSocketIO } from './lib/socket.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import orgRoutes from './routes/org.routes.js';
import rolesRoutes from './routes/roles.routes.js';
import customFieldsRoutes from './routes/custom-fields.routes.js';
import { generateInvoicePdf } from './services/invoice-pdf.service.js';
import { globalSearch } from './services/search.service.js';
import { getDashboardStats } from './services/dashboard.service.js';

// Module manifests
import { coreManifest } from '@nexus/module-core';
import { crmManifest } from '@nexus/module-crm';
import { erpManifest } from '@nexus/module-erp';
import { agentsManifest } from '@nexus/module-agents';
import { chatManifest } from '@nexus/module-chat';
import { emailManifest } from '@nexus/module-email';

const app = express();
const httpServer = createServer(app);

// ─── Global Middleware ───
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use((req, _res, next) => {
  (req as any).requestId = uuidv4();
  next();
});
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true }));

// ─── Register Modules ───
registry.register(coreManifest);
registry.register(crmManifest);
registry.register(erpManifest);
registry.register(agentsManifest);
registry.register(chatManifest);
registry.register(emailManifest);

// ─── Core Routes (no module guard) ───
app.use('/api/auth', authRoutes);
app.use('/api/orgs', orgRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/custom-fields', customFieldsRoutes);

// ─── Module metadata endpoints ───
app.get('/api/modules/navigation', authMiddleware, tenantMiddleware, (_req, res) => {
  res.json({ success: true, data: registry.getNavigationItems() });
});

app.get('/api/modules/entity-types', authMiddleware, tenantMiddleware, (_req, res) => {
  res.json({ success: true, data: registry.getEntityTypes() });
});

// ─── Socket.IO (init before module routes so emit is available) ───
const io = initSocketIO(httpServer, env.CORS_ORIGIN);

// ─── Module Routes (with module guard) ───
const ctx = {
  db: db as any,
  emit: (room: string, event: string, data: unknown) => io.to(room).emit(event, data),
};
const moduleRouters = registry.createRouters(ctx);
for (const { key, router } of moduleRouters) {
  app.use(`/api/${key}`, authMiddleware, tenantMiddleware, moduleGuard(key), router);
}

// ─── Dashboard ───
app.get('/api/dashboard', authMiddleware, tenantMiddleware, async (req, res, next) => {
  try {
    const stats = await getDashboardStats(req.orgId!);
    res.json({ success: true, data: stats });
  } catch (e) { next(e); }
});

// ─── Global Search ───
app.get('/api/search', authMiddleware, tenantMiddleware, async (req, res, next) => {
  try {
    const results = await globalSearch(req.orgId!, req.query.q as string, parseInt(req.query.limit as string) || 10);
    res.json({ success: true, data: results });
  } catch (e) { next(e); }
});

// ─── Invoice PDF ───
app.get('/api/erp/invoices/:id/pdf', authMiddleware, tenantMiddleware, async (req, res, next) => {
  try {
    const pdf = await generateInvoicePdf(req.orgId!, req.params.id as string);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${req.params.id}.pdf"`);
    res.send(pdf);
  } catch (e) { next(e); }
});

// ─── Health Check ───
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler ───
app.use(errorHandler);

// ─── Start Server ───
httpServer.listen(env.PORT, () => {
  console.log(`🚀 Nexus API running on port ${env.PORT}`);
  console.log(`📦 Modules loaded: ${registry.getAllManifests().map(m => m.key).join(', ')}`);
});

export default app;
