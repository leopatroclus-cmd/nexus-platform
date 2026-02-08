import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { eq, and, isNull } from 'drizzle-orm';
import {
  organizations, users, orgMemberships, roles, permissions,
  rolePermissions, orgModules, refreshTokens,
} from '@nexus/database';
import { SEED_PERMISSIONS, ROLE_PERMISSION_MAP } from '@nexus/database/src/seed/permissions.js';
import { db } from '../lib/db.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js';
import { AppError, ConflictError, NotFoundError, UnauthorizedError } from '../lib/errors.js';
import { slugify } from '@nexus/utils';
import { JWT_REFRESH_EXPIRY_MS } from '@nexus/utils';

export async function register(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  orgName: string;
}) {
  // Check if email exists
  const [existingUser] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existingUser) {
    throw new ConflictError('Email already registered');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const slug = slugify(input.orgName) + '-' + crypto.randomBytes(3).toString('hex');

  // Create org
  const [org] = await db.insert(organizations).values({
    name: input.orgName,
    slug,
  }).returning();

  // Create user
  const [user] = await db.insert(users).values({
    email: input.email,
    passwordHash,
    firstName: input.firstName,
    lastName: input.lastName,
  }).returning();

  // Create system roles for org
  const systemRoles = ['admin', 'manager', 'member', 'viewer'];
  const createdRoles = await db.insert(roles).values(
    systemRoles.map(name => ({ orgId: org.id, name, isSystem: true })),
  ).returning();

  const adminRole = createdRoles.find(r => r.name === 'admin')!;

  // Seed permissions (if not already seeded)
  for (const perm of SEED_PERMISSIONS) {
    await db.insert(permissions).values(perm).onConflictDoNothing();
  }

  // Assign permissions to roles
  const allPerms = await db.select().from(permissions);
  for (const role of createdRoles) {
    const allowedCodes = ROLE_PERMISSION_MAP[role.name] || [];
    const permIds = allPerms.filter(p => allowedCodes.includes(p.code)).map(p => p.id);
    if (permIds.length > 0) {
      await db.insert(rolePermissions).values(
        permIds.map(permissionId => ({ roleId: role.id, permissionId })),
      ).onConflictDoNothing();
    }
  }

  // Create membership (owner + admin)
  await db.insert(orgMemberships).values({
    orgId: org.id,
    userId: user.id,
    roleId: adminRole.id,
    isOwner: true,
  });

  // Enable default modules
  await db.insert(orgModules).values([
    { orgId: org.id, moduleKey: 'core', isEnabled: true },
    { orgId: org.id, moduleKey: 'crm', isEnabled: true },
  ]);

  // Generate tokens
  const userPerms = allPerms.map(p => p.code);
  const tokens = await generateTokens(user.id, org.id, 'admin', userPerms);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    org: { id: org.id, name: org.name, slug: org.slug },
    ...tokens,
  };
}

export async function login(input: { email: string; password: string; orgId?: string }) {
  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const validPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!validPassword) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Find memberships
  const memberships = await db
    .select({
      orgId: orgMemberships.orgId,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      roleName: roles.name,
      roleId: roles.id,
      isOwner: orgMemberships.isOwner,
    })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .innerJoin(roles, eq(orgMemberships.roleId, roles.id))
    .where(eq(orgMemberships.userId, user.id));

  if (memberships.length === 0) {
    throw new UnauthorizedError('No organization membership found');
  }

  // Pick org
  let membership = input.orgId
    ? memberships.find(m => m.orgId === input.orgId)
    : memberships[0];

  if (!membership) {
    throw new NotFoundError('Organization membership');
  }

  // Get permissions for role
  const rolePerms = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, membership.roleId));

  const permCodes = rolePerms.map(p => p.code);
  const tokens = await generateTokens(user.id, membership.orgId, membership.roleName, permCodes);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
    org: {
      id: membership.orgId,
      name: membership.orgName,
      slug: membership.orgSlug,
    },
    organizations: memberships.map(m => ({
      id: m.orgId,
      name: m.orgName,
      slug: m.orgSlug,
      role: m.roleName,
    })),
    ...tokens,
  };
}

export async function refresh(refreshTokenValue: string) {
  const payload = verifyRefreshToken(refreshTokenValue);
  const tokenHash = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');

  const [storedToken] = await db
    .select()
    .from(refreshTokens)
    .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
    .limit(1);

  if (!storedToken) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  if (storedToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token expired');
  }

  // Revoke old token
  await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, storedToken.id));

  // Get current permissions
  const [membership] = await db
    .select({ roleId: orgMemberships.roleId, roleName: roles.name })
    .from(orgMemberships)
    .innerJoin(roles, eq(orgMemberships.roleId, roles.id))
    .where(and(eq(orgMemberships.userId, payload.sub), eq(orgMemberships.orgId, payload.orgId)))
    .limit(1);

  if (!membership) {
    throw new UnauthorizedError('Membership not found');
  }

  const rolePerms = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, membership.roleId));

  const permCodes = rolePerms.map(p => p.code);
  return generateTokens(payload.sub, payload.orgId, membership.roleName, permCodes);
}

export async function logout(refreshTokenValue: string) {
  const tokenHash = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');
  await db
    .update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.tokenHash, tokenHash));
}

export async function switchOrg(userId: string, orgId: string) {
  const [membership] = await db
    .select({ roleId: orgMemberships.roleId, roleName: roles.name, orgName: organizations.name, orgSlug: organizations.slug })
    .from(orgMemberships)
    .innerJoin(roles, eq(orgMemberships.roleId, roles.id))
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(and(eq(orgMemberships.userId, userId), eq(orgMemberships.orgId, orgId)))
    .limit(1);

  if (!membership) {
    throw new NotFoundError('Organization membership');
  }

  const rolePerms = await db
    .select({ code: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, membership.roleId));

  const permCodes = rolePerms.map(p => p.code);
  const tokens = await generateTokens(userId, orgId, membership.roleName, permCodes);

  return {
    org: { id: orgId, name: membership.orgName, slug: membership.orgSlug },
    ...tokens,
  };
}

export async function getMe(userId: string, orgId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) {
    throw new NotFoundError('User');
  }

  const [membership] = await db
    .select({
      roleName: roles.name,
      isOwner: orgMemberships.isOwner,
      orgName: organizations.name,
      orgSlug: organizations.slug,
    })
    .from(orgMemberships)
    .innerJoin(roles, eq(orgMemberships.roleId, roles.id))
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(and(eq(orgMemberships.userId, userId), eq(orgMemberships.orgId, orgId)))
    .limit(1);

  const allMemberships = await db
    .select({ orgId: orgMemberships.orgId, orgName: organizations.name, orgSlug: organizations.slug })
    .from(orgMemberships)
    .innerJoin(organizations, eq(orgMemberships.orgId, organizations.id))
    .where(eq(orgMemberships.userId, userId));

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    orgId,
    orgName: membership?.orgName,
    orgSlug: membership?.orgSlug,
    role: membership?.roleName,
    isOwner: membership?.isOwner,
    organizations: allMemberships,
  };
}

async function generateTokens(userId: string, orgId: string, role: string, permissions: string[]) {
  const tokenPayload = { sub: userId, orgId, role, permissions };
  const accessToken = signAccessToken(tokenPayload);
  const refreshTokenValue = signRefreshToken(tokenPayload);

  const tokenHash = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');
  await db.insert(refreshTokens).values({
    userId,
    tokenHash,
    orgId,
    expiresAt: new Date(Date.now() + JWT_REFRESH_EXPIRY_MS),
  });

  return { accessToken, refreshToken: refreshTokenValue };
}
