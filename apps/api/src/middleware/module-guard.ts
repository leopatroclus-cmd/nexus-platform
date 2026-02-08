import type { Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { orgModules } from '@nexus/database';
import { ForbiddenError } from '../lib/errors.js';
import { db } from '../lib/db.js';

export function moduleGuard(moduleKey: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.orgId) {
      return next(new ForbiddenError('No organization context'));
    }

    // Core module is always enabled
    if (moduleKey === 'core') {
      return next();
    }

    const [orgModule] = await db
      .select()
      .from(orgModules)
      .where(
        and(
          eq(orgModules.orgId, req.orgId),
          eq(orgModules.moduleKey, moduleKey),
          eq(orgModules.isEnabled, true),
        ),
      )
      .limit(1);

    if (!orgModule) {
      return next(new ForbiddenError(`Module '${moduleKey}' is not enabled for this organization`));
    }

    next();
  };
}
