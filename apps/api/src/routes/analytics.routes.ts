import { Router } from 'express';
import { eq, and, asc } from 'drizzle-orm';
import { pinnedCharts } from '@nexus/database';
import { db } from '../lib/db.js';
import { NotFoundError } from '../lib/errors.js';

const router = Router();

// GET /api/analytics/pins — list user's pinned charts
router.get('/pins', async (req, res, next) => {
  try {
    const pins = await db
      .select()
      .from(pinnedCharts)
      .where(and(eq(pinnedCharts.orgId, req.orgId!), eq(pinnedCharts.userId, req.userId!)))
      .orderBy(asc(pinnedCharts.displayOrder));

    res.json({ success: true, data: pins });
  } catch (e) { next(e); }
});

// POST /api/analytics/pins — create a pin
router.post('/pins', async (req, res, next) => {
  try {
    const { query, toolName, toolArgs, resultData, chartType, title } = req.body;

    // Get next display order
    const existing = await db
      .select()
      .from(pinnedCharts)
      .where(and(eq(pinnedCharts.orgId, req.orgId!), eq(pinnedCharts.userId, req.userId!)));

    const [pin] = await db.insert(pinnedCharts).values({
      orgId: req.orgId!,
      userId: req.userId!,
      query,
      toolName,
      toolArgs,
      resultData,
      chartType,
      title,
      displayOrder: existing.length,
    }).returning();

    res.status(201).json({ success: true, data: pin });
  } catch (e) { next(e); }
});

// DELETE /api/analytics/pins/:id — unpin
router.delete('/pins/:id', async (req, res, next) => {
  try {
    const [pin] = await db
      .select()
      .from(pinnedCharts)
      .where(and(
        eq(pinnedCharts.id, req.params.id),
        eq(pinnedCharts.orgId, req.orgId!),
        eq(pinnedCharts.userId, req.userId!),
      ));

    if (!pin) throw new NotFoundError('Pinned chart not found');

    await db.delete(pinnedCharts).where(eq(pinnedCharts.id, req.params.id));
    res.json({ success: true, message: 'Unpinned' });
  } catch (e) { next(e); }
});

// PUT /api/analytics/pins/reorder — reorder pins
router.put('/pins/reorder', async (req, res, next) => {
  try {
    const { pinIds } = req.body as { pinIds: string[] };

    await Promise.all(
      pinIds.map((id, index) =>
        db.update(pinnedCharts)
          .set({ displayOrder: index, updatedAt: new Date() })
          .where(and(
            eq(pinnedCharts.id, id),
            eq(pinnedCharts.orgId, req.orgId!),
            eq(pinnedCharts.userId, req.userId!),
          )),
      ),
    );

    res.json({ success: true, message: 'Reordered' });
  } catch (e) { next(e); }
});

export default router;
