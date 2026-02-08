import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { requirePermission } from '../middleware/permissions.js';
import * as rolesService from '../services/roles.service.js';

const router = Router();
router.use(authMiddleware, tenantMiddleware);

router.get('/', requirePermission('core:roles:read'), async (req, res, next) => {
  try {
    const rolesList = await rolesService.listRoles(req.orgId!);
    res.json({ success: true, data: rolesList });
  } catch (e) { next(e); }
});

router.get('/permissions', async (req, res, next) => {
  try {
    const perms = await rolesService.listPermissions();
    res.json({ success: true, data: perms });
  } catch (e) { next(e); }
});

router.get('/:roleId', requirePermission('core:roles:read'), async (req, res, next) => {
  try {
    const role = await rolesService.getRole(req.orgId!, req.params.roleId as string);
    res.json({ success: true, data: role });
  } catch (e) { next(e); }
});

router.post('/', requirePermission('core:roles:manage'), async (req, res, next) => {
  try {
    const role = await rolesService.createRole(req.orgId!, req.body.name);
    res.status(201).json({ success: true, data: role });
  } catch (e) { next(e); }
});

router.put('/:roleId/permissions', requirePermission('core:roles:manage'), async (req, res, next) => {
  try {
    const role = await rolesService.updateRolePermissions(req.orgId!, req.params.roleId as string, req.body.permissionIds);
    res.json({ success: true, data: role });
  } catch (e) { next(e); }
});

export default router;
