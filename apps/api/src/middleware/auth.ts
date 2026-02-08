import type { Request, Response, NextFunction } from 'express';
import { eq, and } from 'drizzle-orm';
import { agents, agentPermissions, permissions } from '@nexus/database';
import { verifyAccessToken } from '../lib/jwt.js';
import { UnauthorizedError } from '../lib/errors.js';
import { db } from '../lib/db.js';
import { AGENT_API_KEY_PREFIX } from '@nexus/utils';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      orgId?: string;
      agentId?: string;
      role?: string;
      permissions?: string[];
      isAgent?: boolean;
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

    // Agent API key auth
    if (token.startsWith(AGENT_API_KEY_PREFIX)) {
      return await agentAuth(token, req, next);
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
    req.isAgent = false;
    next();
  } catch (error: any) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Invalid or expired token'));
    } else {
      next(error);
    }
  }
}

async function agentAuth(apiKey: string, req: Request, next: NextFunction) {
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.apiKeyHash, keyHash))
    .limit(1);

  if (!agent) {
    throw new UnauthorizedError('Invalid API key');
  }

  if (agent.status !== 'active') {
    throw new UnauthorizedError('Agent is not active');
  }

  // Fetch agent permissions
  const agentPerms = await db
    .select({ code: permissions.code })
    .from(agentPermissions)
    .innerJoin(permissions, eq(agentPermissions.permissionId, permissions.id))
    .where(eq(agentPermissions.agentId, agent.id));

  req.agentId = agent.id;
  req.orgId = agent.orgId;
  req.permissions = agentPerms.map(p => p.code);
  req.isAgent = true;

  next();
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
