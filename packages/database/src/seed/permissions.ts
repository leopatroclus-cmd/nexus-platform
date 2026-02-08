export const SEED_PERMISSIONS = [
  // Core
  { code: 'core:orgs:read', module: 'core', resource: 'orgs', action: 'read', description: 'View organization settings' },
  { code: 'core:orgs:update', module: 'core', resource: 'orgs', action: 'update', description: 'Update organization settings' },
  { code: 'core:members:read', module: 'core', resource: 'members', action: 'read', description: 'View org members' },
  { code: 'core:members:create', module: 'core', resource: 'members', action: 'create', description: 'Invite new members' },
  { code: 'core:members:update', module: 'core', resource: 'members', action: 'update', description: 'Update member roles' },
  { code: 'core:members:delete', module: 'core', resource: 'members', action: 'delete', description: 'Remove members' },
  { code: 'core:roles:read', module: 'core', resource: 'roles', action: 'read', description: 'View roles' },
  { code: 'core:roles:manage', module: 'core', resource: 'roles', action: 'manage', description: 'Manage roles and permissions' },
  { code: 'core:modules:manage', module: 'core', resource: 'modules', action: 'manage', description: 'Enable/disable modules' },
  { code: 'core:custom_fields:manage', module: 'core', resource: 'custom_fields', action: 'manage', description: 'Manage custom field definitions' },

  // CRM
  { code: 'crm:contacts:read', module: 'crm', resource: 'contacts', action: 'read', description: 'View contacts' },
  { code: 'crm:contacts:create', module: 'crm', resource: 'contacts', action: 'create', description: 'Create contacts' },
  { code: 'crm:contacts:update', module: 'crm', resource: 'contacts', action: 'update', description: 'Update contacts' },
  { code: 'crm:contacts:delete', module: 'crm', resource: 'contacts', action: 'delete', description: 'Delete contacts' },
  { code: 'crm:companies:read', module: 'crm', resource: 'companies', action: 'read', description: 'View companies' },
  { code: 'crm:companies:create', module: 'crm', resource: 'companies', action: 'create', description: 'Create companies' },
  { code: 'crm:companies:update', module: 'crm', resource: 'companies', action: 'update', description: 'Update companies' },
  { code: 'crm:companies:delete', module: 'crm', resource: 'companies', action: 'delete', description: 'Delete companies' },
  { code: 'crm:deals:read', module: 'crm', resource: 'deals', action: 'read', description: 'View deals' },
  { code: 'crm:deals:create', module: 'crm', resource: 'deals', action: 'create', description: 'Create deals' },
  { code: 'crm:deals:update', module: 'crm', resource: 'deals', action: 'update', description: 'Update deals' },
  { code: 'crm:deals:delete', module: 'crm', resource: 'deals', action: 'delete', description: 'Delete deals' },
  { code: 'crm:activities:read', module: 'crm', resource: 'activities', action: 'read', description: 'View activities' },
  { code: 'crm:activities:create', module: 'crm', resource: 'activities', action: 'create', description: 'Create activities' },
  { code: 'crm:activities:update', module: 'crm', resource: 'activities', action: 'update', description: 'Update activities' },
  { code: 'crm:activities:delete', module: 'crm', resource: 'activities', action: 'delete', description: 'Delete activities' },
  { code: 'crm:notes:read', module: 'crm', resource: 'notes', action: 'read', description: 'View notes' },
  { code: 'crm:notes:create', module: 'crm', resource: 'notes', action: 'create', description: 'Create notes' },
  { code: 'crm:notes:update', module: 'crm', resource: 'notes', action: 'update', description: 'Update notes' },
  { code: 'crm:notes:delete', module: 'crm', resource: 'notes', action: 'delete', description: 'Delete notes' },
  { code: 'crm:deal_stages:manage', module: 'crm', resource: 'deal_stages', action: 'manage', description: 'Manage deal pipeline stages' },

  // ERP
  { code: 'erp:clients:read', module: 'erp', resource: 'clients', action: 'read', description: 'View clients' },
  { code: 'erp:clients:create', module: 'erp', resource: 'clients', action: 'create', description: 'Create clients' },
  { code: 'erp:clients:update', module: 'erp', resource: 'clients', action: 'update', description: 'Update clients' },
  { code: 'erp:clients:delete', module: 'erp', resource: 'clients', action: 'delete', description: 'Delete clients' },
  { code: 'erp:inventory:read', module: 'erp', resource: 'inventory', action: 'read', description: 'View inventory' },
  { code: 'erp:inventory:create', module: 'erp', resource: 'inventory', action: 'create', description: 'Create inventory items' },
  { code: 'erp:inventory:update', module: 'erp', resource: 'inventory', action: 'update', description: 'Update inventory' },
  { code: 'erp:inventory:delete', module: 'erp', resource: 'inventory', action: 'delete', description: 'Delete inventory items' },
  { code: 'erp:orders:read', module: 'erp', resource: 'orders', action: 'read', description: 'View orders' },
  { code: 'erp:orders:create', module: 'erp', resource: 'orders', action: 'create', description: 'Create orders' },
  { code: 'erp:orders:update', module: 'erp', resource: 'orders', action: 'update', description: 'Update orders' },
  { code: 'erp:orders:delete', module: 'erp', resource: 'orders', action: 'delete', description: 'Delete orders' },
  { code: 'erp:invoices:read', module: 'erp', resource: 'invoices', action: 'read', description: 'View invoices' },
  { code: 'erp:invoices:create', module: 'erp', resource: 'invoices', action: 'create', description: 'Create invoices' },
  { code: 'erp:invoices:update', module: 'erp', resource: 'invoices', action: 'update', description: 'Update invoices' },
  { code: 'erp:invoices:delete', module: 'erp', resource: 'invoices', action: 'delete', description: 'Delete invoices' },
  { code: 'erp:payments:read', module: 'erp', resource: 'payments', action: 'read', description: 'View payments' },
  { code: 'erp:payments:create', module: 'erp', resource: 'payments', action: 'create', description: 'Record payments' },
  { code: 'erp:payments:update', module: 'erp', resource: 'payments', action: 'update', description: 'Update payments' },
  { code: 'erp:ledger:read', module: 'erp', resource: 'ledger', action: 'read', description: 'View ledger entries' },
  { code: 'erp:chart_of_accounts:manage', module: 'erp', resource: 'chart_of_accounts', action: 'manage', description: 'Manage chart of accounts' },

  // Agents
  { code: 'agents:agents:read', module: 'agents', resource: 'agents', action: 'read', description: 'View agents' },
  { code: 'agents:agents:create', module: 'agents', resource: 'agents', action: 'create', description: 'Create agents' },
  { code: 'agents:agents:update', module: 'agents', resource: 'agents', action: 'update', description: 'Update agents' },
  { code: 'agents:agents:delete', module: 'agents', resource: 'agents', action: 'delete', description: 'Delete agents' },
  { code: 'agents:actions:read', module: 'agents', resource: 'actions', action: 'read', description: 'View agent action logs' },
  { code: 'agents:actions:approve', module: 'agents', resource: 'actions', action: 'approve', description: 'Approve/reject agent actions' },

  // Chat
  { code: 'chat:conversations:read', module: 'chat', resource: 'conversations', action: 'read', description: 'View conversations' },
  { code: 'chat:conversations:create', module: 'chat', resource: 'conversations', action: 'create', description: 'Create conversations' },
  { code: 'chat:messages:read', module: 'chat', resource: 'messages', action: 'read', description: 'Read messages' },
  { code: 'chat:messages:create', module: 'chat', resource: 'messages', action: 'create', description: 'Send messages' },

  // Email
  { code: 'email:accounts:read', module: 'email', resource: 'accounts', action: 'read', description: 'View email accounts' },
  { code: 'email:accounts:manage', module: 'email', resource: 'accounts', action: 'manage', description: 'Manage email accounts' },
  { code: 'email:emails:read', module: 'email', resource: 'emails', action: 'read', description: 'Read emails' },
  { code: 'email:emails:send', module: 'email', resource: 'emails', action: 'send', description: 'Send emails' },
];

export const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  admin: SEED_PERMISSIONS.map(p => p.code),
  manager: SEED_PERMISSIONS
    .filter(p => !p.code.includes(':delete') && !p.code.includes(':manage') || p.code === 'crm:deal_stages:manage')
    .map(p => p.code),
  member: SEED_PERMISSIONS
    .filter(p => p.action === 'read' || p.action === 'create' || p.action === 'update')
    .filter(p => !p.code.startsWith('core:') || p.code === 'core:orgs:read' || p.code === 'core:members:read')
    .map(p => p.code),
  viewer: SEED_PERMISSIONS
    .filter(p => p.action === 'read')
    .map(p => p.code),
};
