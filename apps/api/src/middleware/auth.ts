import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { UnauthorizedError } from '../lib/errors.js';
import { env } from '../env.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      orgId?: string;
      role?: string;
      permissions?: string[];
    }
  }
}

export async function authMiddleware(req: Request, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing authorization header');
    }

    const token = authHeader.slice(7);

    // Internal API token (for localhost agent callbacks)
    if (env.INTERNAL_API_TOKEN && token === env.INTERNAL_API_TOKEN) {
      if (!env.INTERNAL_ORG_ID) {
        throw new UnauthorizedError('INTERNAL_ORG_ID not configured');
      }
      req.userId = 'internal';
      req.orgId = env.INTERNAL_ORG_ID;
      req.role = 'admin';
      req.permissions = ['*'];
      return next();
    }

    // JWT auth
    const payload = verifyAccessToken(token);
    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }

    req.userId = payload.sub;
    req.orgId = payload.orgId;
    req.role = payload.role;
    req.permissions = payload.permissions;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Invalid or expired token'));
    } else {
      next(error);
    }
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    req.orgId = payload.orgId;
    req.role = payload.role;
    req.permissions = payload.permissions;
  } catch {
    // Ignore invalid tokens in optional auth
  }

  next();
}
