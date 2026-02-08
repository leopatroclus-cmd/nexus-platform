import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/permissions.js';
import { validate } from '../middleware/validate.js';
import { customFieldCreateSchema, customFieldUpdateSchema } from '@nexus/utils';
import * as cfService from '../services/custom-fields.service.js';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/:entityType', async (req, res, next) => {
  try {
    const fields = await cfService.list(req.orgId!, req.params.entityType as string);
    res.json({ success: true, data: fields });
  } catch (e) { next(e); }
});

router.post('/', requirePermission('core:custom_fields:manage'), validate(customFieldCreateSchema), async (req, res, next) => {
  try {
    const field = await cfService.create(req.orgId!, req.body);
    res.status(201).json({ success: true, data: field });
  } catch (e) { next(e); }
});

router.put('/:id', requirePermission('core:custom_fields:manage'), validate(customFieldUpdateSchema), async (req, res, next) => {
  try {
    const field = await cfService.update(req.orgId!, req.params.id as string, req.body);
    res.json({ success: true, data: field });
  } catch (e) { next(e); }
});

router.delete('/:id', requirePermission('core:custom_fields:manage'), async (req, res, next) => {
  try {
    await cfService.remove(req.orgId!, req.params.id as string);
    res.json({ success: true, message: 'Field deactivated' });
  } catch (e) { next(e); }
});

router.post('/:entityType/reorder', requirePermission('core:custom_fields:manage'), async (req, res, next) => {
  try {
    await cfService.reorder(req.orgId!, req.params.entityType as string, req.body.fieldIds);
    res.json({ success: true, message: 'Fields reordered' });
  } catch (e) { next(e); }
});

export default router;
