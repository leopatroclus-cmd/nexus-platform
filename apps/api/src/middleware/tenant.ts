import type { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../lib/errors.js';
import { db } from '../lib/db.js';
import { sql } from 'drizzle-orm';

export async function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (!req.orgId) {
    return next(new BadRequestError('No organization context'));
  }

  try {
    // Set the org_id for PostgreSQL RLS policies
    await db.execute(sql`SELECT set_config('app.current_org_id', ${req.orgId}, true)`);
    next();
  } catch (error) {
    next(error);
  }
}
