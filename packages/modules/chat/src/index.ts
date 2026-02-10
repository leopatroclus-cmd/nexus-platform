import type { ModuleManifest } from '@nexus/types';
import { createChatRouter } from './backend/routes.js';

export const chatManifest: ModuleManifest = {
  key: 'chat',
  name: 'Chat',
  description: 'Conversations, messages, real-time communication between users and agents',
  version: '1.0.0',
  permissions: [
    { code: 'chat:conversations:read', module: 'chat', resource: 'conversations', action: 'read', description: 'View conversations' },
    { code: 'chat:conversations:create', module: 'chat', resource: 'conversations', action: 'create', description: 'Create conversations' },
    { code: 'chat:messages:read', module: 'chat', resource: 'messages', action: 'read', description: 'Read messages' },
    { code: 'chat:messages:create', module: 'chat', resource: 'messages', action: 'create', description: 'Send messages' },
  ],
  navigation: [
    { label: 'Chat', icon: 'MessageSquare', path: '/chat' },
  ],
  entityTypes: [],
  createRouter: (ctx) => createChatRouter(ctx.db as any, ctx.emit, (ctx as any).agentTrigger, (ctx as any).encryptionKey),
};

export default chatManifest;
