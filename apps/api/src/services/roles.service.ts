import { eq, and } from 'drizzle-orm';
import { roles, permissions, rolePermissions } from '@nexus/database';
import { db } from '../lib/db.js';
import { NotFoundError, BadRequestError } from '../lib/errors.js';

export async function listRoles(orgId: string) {
  return db.select().from(roles).where(eq(roles.orgId, orgId));
}

export async function getRole(orgId: string, roleId: string) {
  const [role] = await db.select().from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.orgId, orgId))).limit(1);
  if (!role) throw new NotFoundError('Role');

  const perms = await db.select({ permissionId: rolePermissions.permissionId, code: permissions.code })
    .from(rolePermissions).innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));

  return { ...role, permissions: perms };
}

export async function createRole(orgId: string, name: string) {
  const [role] = await db.insert(roles).values({ orgId, name, isSystem: false }).returning();
  return role;
}

export async function updateRolePermissions(orgId: string, roleId: string, permissionIds: string[]) {
  const [role] = await db.select().from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.orgId, orgId))).limit(1);
  if (!role) throw new NotFoundError('Role');
  if (role.isSystem && role.name === 'admin') throw new BadRequestError('Cannot modify admin role permissions');

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  if (permissionIds.length > 0) {
    await db.insert(rolePermissions).values(permissionIds.map(permissionId => ({ roleId, permissionId })));
  }
  return getRole(orgId, roleId);
}

export async function listPermissions() {
  return db.select().from(permissions);
}
