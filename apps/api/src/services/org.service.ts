import { eq, and } from 'drizzle-orm';
import { organizations, users, orgMemberships, roles, orgModules } from '@nexus/database';
import { db } from '../lib/db.js';
import { NotFoundError, BadRequestError, ConflictError } from '../lib/errors.js';

export async function getOrg(orgId: string) {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
  if (!org) throw new NotFoundError('Organization');
  return org;
}

export async function updateOrg(orgId: string, data: { name?: string; settings?: Record<string, unknown> }) {
  const [org] = await db.update(organizations).set({ ...data, updatedAt: new Date() }).where(eq(organizations.id, orgId)).returning();
  if (!org) throw new NotFoundError('Organization');
  return org;
}

export async function getMembers(orgId: string) {
  return db
    .select({
      userId: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      roleName: roles.name,
      roleId: roles.id,
      isOwner: orgMemberships.isOwner,
      joinedAt: orgMemberships.createdAt,
    })
    .from(orgMemberships)
    .innerJoin(users, eq(orgMemberships.userId, users.id))
    .innerJoin(roles, eq(orgMemberships.roleId, roles.id))
    .where(eq(orgMemberships.orgId, orgId));
}

export async function addMember(orgId: string, email: string, roleId: string) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new NotFoundError('User with that email');

  const [existing] = await db.select().from(orgMemberships)
    .where(and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.userId, user.id))).limit(1);
  if (existing) throw new ConflictError('User is already a member');

  const [role] = await db.select().from(roles).where(and(eq(roles.id, roleId), eq(roles.orgId, orgId))).limit(1);
  if (!role) throw new NotFoundError('Role');

  await db.insert(orgMemberships).values({ orgId, userId: user.id, roleId });
  return { userId: user.id, email: user.email, roleName: role.name };
}

export async function updateMember(orgId: string, userId: string, roleId: string) {
  const [role] = await db.select().from(roles).where(and(eq(roles.id, roleId), eq(roles.orgId, orgId))).limit(1);
  if (!role) throw new NotFoundError('Role');

  const [membership] = await db.update(orgMemberships).set({ roleId })
    .where(and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.userId, userId))).returning();
  if (!membership) throw new NotFoundError('Membership');
  return membership;
}

export async function removeMember(orgId: string, userId: string) {
  const [membership] = await db.select().from(orgMemberships)
    .where(and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.userId, userId))).limit(1);
  if (!membership) throw new NotFoundError('Membership');
  if (membership.isOwner) throw new BadRequestError('Cannot remove organization owner');

  await db.delete(orgMemberships).where(eq(orgMemberships.id, membership.id));
}

export async function getModules(orgId: string) {
  return db.select().from(orgModules).where(eq(orgModules.orgId, orgId));
}

export async function toggleModule(orgId: string, moduleKey: string, isEnabled: boolean) {
  if (moduleKey === 'core') throw new BadRequestError('Core module cannot be disabled');

  const [existing] = await db.select().from(orgModules)
    .where(and(eq(orgModules.orgId, orgId), eq(orgModules.moduleKey, moduleKey))).limit(1);

  if (existing) {
    const [updated] = await db.update(orgModules).set({ isEnabled }).where(eq(orgModules.id, existing.id)).returning();
    return updated;
  } else {
    const [created] = await db.insert(orgModules).values({ orgId, moduleKey, isEnabled }).returning();
    return created;
  }
}
