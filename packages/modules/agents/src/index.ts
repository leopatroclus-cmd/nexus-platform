import type { ModuleManifest } from '@nexus/types';
import { createAgentsRouter } from './backend/routes.js';

export const agentsManifest: ModuleManifest = {
  key: 'agents',
  name: 'AI Agents',
  description: 'AI agent management, API key auth, tool registry, approval workflows',
  version: '1.0.0',
  permissions: [
    { code: 'agents:agents:read', module: 'agents', resource: 'agents', action: 'read', description: 'View agents' },
    { code: 'agents:agents:create', module: 'agents', resource: 'agents', action: 'create', description: 'Create agents' },
    { code: 'agents:agents:update', module: 'agents', resource: 'agents', action: 'update', description: 'Update agents' },
    { code: 'agents:agents:delete', module: 'agents', resource: 'agents', action: 'delete', description: 'Delete agents' },
    { code: 'agents:actions:read', module: 'agents', resource: 'actions', action: 'read', description: 'View action logs' },
    { code: 'agents:actions:approve', module: 'agents', resource: 'actions', action: 'approve', description: 'Approve actions' },
  ],
  navigation: [
    { label: 'AI Agents', icon: 'Bot', path: '/agents' },
  ],
  entityTypes: [],
  createRouter: (ctx) => createAgentsRouter(ctx.db as any),
};

export default agentsManifest;
