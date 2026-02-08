import type { ModuleManifest } from '@nexus/types';
import { createEmailRouter } from './backend/routes.js';

export const emailManifest: ModuleManifest = {
  key: 'email',
  name: 'Email',
  description: 'Email account sync (IMAP/Gmail/Outlook), parsing, sending, entity linking',
  version: '1.0.0',
  permissions: [
    { code: 'email:accounts:read', module: 'email', resource: 'accounts', action: 'read', description: 'View email accounts' },
    { code: 'email:accounts:manage', module: 'email', resource: 'accounts', action: 'manage', description: 'Manage email accounts' },
    { code: 'email:emails:read', module: 'email', resource: 'emails', action: 'read', description: 'Read emails' },
    { code: 'email:emails:send', module: 'email', resource: 'emails', action: 'send', description: 'Send emails' },
  ],
  navigation: [
    { label: 'Email', icon: 'Mail', path: '/email' },
  ],
  entityTypes: [],
  createRouter: (ctx) => createEmailRouter(ctx.db as any),
};

export default emailManifest;
