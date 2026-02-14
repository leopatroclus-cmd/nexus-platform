import type { ModuleManifest } from '@nexus/types';
import { createCrmRouter } from './backend/routes.js';
import { seedDealStages } from './backend/services/deal-stages.service.js';

export const crmManifest: ModuleManifest = {
  key: 'crm',
  name: 'CRM',
  description: 'Customer Relationship Management — contacts, companies, deals, activities',
  version: '1.0.0',
  permissions: [
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
    { code: 'crm:deal_stages:manage', module: 'crm', resource: 'deal_stages', action: 'manage', description: 'Manage pipeline' },
  ],
  navigation: [
    {
      label: 'CRM',
      icon: 'Handshake',
      path: '/crm',
      children: [
        { label: 'Contacts', icon: 'Users', path: '/crm/contacts' },
        { label: 'Companies', icon: 'Building2', path: '/crm/companies' },
        { label: 'Deals', icon: 'Handshake', path: '/crm/deals' },
        { label: 'Activities', icon: 'CalendarCheck', path: '/crm/activities' },
      ],
    },
  ],
  entityTypes: [
    { key: 'crm_contact', label: 'Contact', pluralLabel: 'Contacts', supportsCustomFields: true, supportsNotes: true, supportsActivities: true, supportsChat: true },
    { key: 'crm_company', label: 'Company', pluralLabel: 'Companies', supportsCustomFields: true, supportsNotes: true, supportsChat: true },
    { key: 'crm_deal', label: 'Deal', pluralLabel: 'Deals', supportsCustomFields: true, supportsNotes: true, supportsActivities: true, supportsChat: true },
  ],
  createRouter: (ctx) => createCrmRouter(ctx.db as any),
  seedOrgDefaults: async (ctx, orgId) => {
    await seedDealStages(ctx.db as any, orgId);
  },
};

export default crmManifest;
