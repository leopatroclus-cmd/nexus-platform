import type { ModuleManifest } from '@nexus/types';

export const coreManifest: ModuleManifest = {
  key: 'core',
  name: 'Core',
  description: 'Authentication, organizations, users, roles, permissions — always enabled',
  version: '1.0.0',
  permissions: [
    { code: 'core:orgs:read', module: 'core', resource: 'orgs', action: 'read', description: 'View org settings' },
    { code: 'core:orgs:update', module: 'core', resource: 'orgs', action: 'update', description: 'Update org settings' },
    { code: 'core:members:read', module: 'core', resource: 'members', action: 'read', description: 'View members' },
    { code: 'core:members:create', module: 'core', resource: 'members', action: 'create', description: 'Invite members' },
    { code: 'core:members:update', module: 'core', resource: 'members', action: 'update', description: 'Update member roles' },
    { code: 'core:members:delete', module: 'core', resource: 'members', action: 'delete', description: 'Remove members' },
    { code: 'core:roles:read', module: 'core', resource: 'roles', action: 'read', description: 'View roles' },
    { code: 'core:roles:manage', module: 'core', resource: 'roles', action: 'manage', description: 'Manage roles' },
    { code: 'core:modules:manage', module: 'core', resource: 'modules', action: 'manage', description: 'Enable/disable modules' },
    { code: 'core:custom_fields:manage', module: 'core', resource: 'custom_fields', action: 'manage', description: 'Manage custom fields' },
  ],
  navigation: [
    { label: 'Dashboard', icon: 'LayoutDashboard', path: '/dashboard' },
    { label: 'Settings', icon: 'Settings', path: '/settings', children: [
      { label: 'Organization', icon: 'Building', path: '/settings/organization' },
      { label: 'Members', icon: 'Users', path: '/settings/members' },
      { label: 'Roles', icon: 'Shield', path: '/settings/roles' },
      { label: 'Modules', icon: 'Puzzle', path: '/settings/modules' },
      { label: 'Custom Fields', icon: 'FormInput', path: '/settings/custom-fields' },
    ]},
  ],
  entityTypes: [],
};

export default coreManifest;
