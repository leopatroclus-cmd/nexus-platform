import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authMiddleware } from '../middleware/auth.js';
import { registerSchema, loginSchema, refreshSchema, switchOrgSchema } from '@nexus/utils';
import * as authService from '../services/auth.service.js';

const router = Router();

router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    next(error);
  }
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const result = await authService.getMe(req.userId!, req.orgId!);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/switch-org', authMiddleware, validate(switchOrgSchema), async (req, res, next) => {
  try {
    const result = await authService.switchOrg(req.userId!, req.body.orgId);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
