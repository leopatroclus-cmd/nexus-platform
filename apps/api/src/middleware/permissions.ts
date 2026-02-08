import type { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../lib/errors.js';

export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.permissions) {
      return next(new ForbiddenError('No permissions found'));
    }

    // Admin role has all permissions
    if (req.role === 'admin') {
      return next();
    }

    const hasPermission = requiredPermissions.some(perm =>
      req.permissions!.includes(perm),
    );

    if (!hasPermission) {
      return next(
        new ForbiddenError(
          `Required permission: ${requiredPermissions.join(' or ')}`,
        ),
      );
    }

    next();
  };
}
