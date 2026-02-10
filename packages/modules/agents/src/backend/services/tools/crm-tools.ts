import type { Tool } from './types.js';
import { listContacts, getContactById } from '@nexus/module-crm/services/contacts.service.js';
import { listCompanies, getCompanyById } from '@nexus/module-crm/services/companies.service.js';

export const crmTools: Tool[] = [
  {
    key: 'crm_search_contacts',
    name: 'search_contacts',
    description: 'Search for contacts in the CRM by name, email, status, or company. Returns a paginated list.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search term to match against name or email' },
        status: { type: 'string', description: 'Filter by status (e.g., active, lead)' },
        companyId: { type: 'string', description: 'Filter by company ID' },
        page: { type: 'number', description: 'Page number (default 1)' },
        limit: { type: 'number', description: 'Results per page (default 25, max 100)' },
      },
    },
    requiredPermission: 'crm:contacts:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      const filter: Record<string, string> = {};
      if (args.status) filter.status = args.status as string;
      if (args.companyId) filter.companyId = args.companyId as string;
      return listContacts(db, orgId, {
        search: args.search as string,
        filter,
        page: args.page as number,
        limit: args.limit as number,
      });
    },
  },
  {
    key: 'crm_get_contact',
    name: 'get_contact',
    description: 'Get a specific contact by their ID. Returns full contact details.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The contact ID' },
      },
      required: ['id'],
    },
    requiredPermission: 'crm:contacts:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return getContactById(db, orgId, args.id as string);
    },
  },
  {
    key: 'crm_search_companies',
    name: 'search_companies',
    description: 'Search for companies in the CRM by name. Returns a paginated list.',
    parameters: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Search term to match against company name' },
        page: { type: 'number', description: 'Page number (default 1)' },
        limit: { type: 'number', description: 'Results per page (default 25, max 100)' },
      },
    },
    requiredPermission: 'crm:companies:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return listCompanies(db, orgId, {
        search: args.search as string,
        page: args.page as number,
        limit: args.limit as number,
      });
    },
  },
  {
    key: 'crm_get_company',
    name: 'get_company',
    description: 'Get a specific company by its ID. Returns full company details.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'The company ID' },
      },
      required: ['id'],
    },
    requiredPermission: 'crm:companies:read',
    isDestructive: false,
    handler: async (db, orgId, args) => {
      return getCompanyById(db, orgId, args.id as string);
    },
  },
];
