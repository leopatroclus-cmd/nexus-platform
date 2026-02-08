import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/permissions.js';
import * as orgService from '../services/org.service.js';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/:orgId', requirePermission('core:orgs:read'), async (req, res, next) => {
  try {
    const org = await orgService.getOrg(req.params.orgId as string);
    res.json({ success: true, data: org });
  } catch (e) { next(e); }
});

router.put('/:orgId', requirePermission('core:orgs:update'), async (req, res, next) => {
  try {
    const org = await orgService.updateOrg(req.params.orgId as string, req.body);
    res.json({ success: true, data: org });
  } catch (e) { next(e); }
});

router.get('/:orgId/members', requirePermission('core:members:read'), async (req, res, next) => {
  try {
    const members = await orgService.getMembers(req.params.orgId as string);
    res.json({ success: true, data: members });
  } catch (e) { next(e); }
});

router.post('/:orgId/members', requirePermission('core:members:create'), async (req, res, next) => {
  try {
    const member = await orgService.addMember(req.params.orgId as string, req.body.email, req.body.roleId);
    res.status(201).json({ success: true, data: member });
  } catch (e) { next(e); }
});

router.put('/:orgId/members/:userId', requirePermission('core:members:update'), async (req, res, next) => {
  try {
    const result = await orgService.updateMember(req.params.orgId as string, req.params.userId as string, req.body.roleId);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

router.delete('/:orgId/members/:userId', requirePermission('core:members:delete'), async (req, res, next) => {
  try {
    await orgService.removeMember(req.params.orgId as string, req.params.userId as string);
    res.json({ success: true, message: 'Member removed' });
  } catch (e) { next(e); }
});

router.get('/:orgId/modules', requirePermission('core:orgs:read'), async (req, res, next) => {
  try {
    const modules = await orgService.getModules(req.params.orgId as string);
    res.json({ success: true, data: modules });
  } catch (e) { next(e); }
});

router.put('/:orgId/modules/:moduleKey', requirePermission('core:modules:manage'), async (req, res, next) => {
  try {
    const result = await orgService.toggleModule(req.params.orgId as string, req.params.moduleKey as string, req.body.isEnabled);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
});

export default router;
