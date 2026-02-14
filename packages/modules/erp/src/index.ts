import type { ModuleManifest } from '@nexus/types';
import { createErpRouter } from './backend/routes.js';
import { seedDefaults as seedCoA } from './backend/services/chart-of-accounts.service.js';

export const erpManifest: ModuleManifest = {
  key: 'erp',
  name: 'ERP',
  description: 'Enterprise Resource Planning — clients, inventory, orders, invoices, payments, accounting',
  version: '1.0.0',
  permissions: [
    { code: 'erp:clients:read', module: 'erp', resource: 'clients', action: 'read', description: 'View clients' },
    { code: 'erp:clients:create', module: 'erp', resource: 'clients', action: 'create', description: 'Create clients' },
    { code: 'erp:clients:update', module: 'erp', resource: 'clients', action: 'update', description: 'Update clients' },
    { code: 'erp:clients:delete', module: 'erp', resource: 'clients', action: 'delete', description: 'Delete clients' },
    { code: 'erp:pricelists:read', module: 'erp', resource: 'pricelists', action: 'read', description: 'View pricelists' },
    { code: 'erp:pricelists:create', module: 'erp', resource: 'pricelists', action: 'create', description: 'Create pricelists' },
    { code: 'erp:pricelists:update', module: 'erp', resource: 'pricelists', action: 'update', description: 'Update pricelists' },
    { code: 'erp:pricelists:delete', module: 'erp', resource: 'pricelists', action: 'delete', description: 'Delete pricelists' },
    { code: 'erp:inventory:read', module: 'erp', resource: 'inventory', action: 'read', description: 'View inventory' },
    { code: 'erp:inventory:create', module: 'erp', resource: 'inventory', action: 'create', description: 'Create items' },
    { code: 'erp:inventory:update', module: 'erp', resource: 'inventory', action: 'update', description: 'Update items' },
    { code: 'erp:inventory:delete', module: 'erp', resource: 'inventory', action: 'delete', description: 'Delete items' },
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
    { code: 'erp:ledger:read', module: 'erp', resource: 'ledger', action: 'read', description: 'View ledger' },
    { code: 'erp:chart_of_accounts:manage', module: 'erp', resource: 'chart_of_accounts', action: 'manage', description: 'Manage accounts' },
  ],
  navigation: [
    { label: 'Clients', icon: 'Users2', path: '/erp/clients' },
    { label: 'Pricelists', icon: 'Tags', path: '/erp/pricelists' },
    { label: 'Inventory', icon: 'Package', path: '/erp/inventory' },
    { label: 'Orders', icon: 'ShoppingCart', path: '/erp/orders' },
    { label: 'Invoices', icon: 'FileText', path: '/erp/invoices' },
    { label: 'Payments', icon: 'CreditCard', path: '/erp/payments' },
    { label: 'Ledger', icon: 'BookOpen', path: '/erp/ledger' },
    { label: 'Import Data', icon: 'Upload', path: '/erp/import' },
  ],
  entityTypes: [
    { key: 'erp_client', label: 'Client', pluralLabel: 'Clients', supportsCustomFields: true, supportsNotes: true, supportsChat: true },
    { key: 'erp_inventory', label: 'Inventory Item', pluralLabel: 'Inventory', supportsCustomFields: true },
    { key: 'erp_order', label: 'Order', pluralLabel: 'Orders', supportsCustomFields: true, supportsChat: true },
    { key: 'erp_invoice', label: 'Invoice', pluralLabel: 'Invoices', supportsCustomFields: true, supportsChat: true },
    { key: 'erp_payment', label: 'Payment', pluralLabel: 'Payments', supportsCustomFields: false },
  ],
  createRouter: (ctx) => createErpRouter(ctx.db as any),
  seedOrgDefaults: async (ctx, orgId) => {
    await seedCoA(ctx.db as any, orgId);
  },
};

export default erpManifest;
