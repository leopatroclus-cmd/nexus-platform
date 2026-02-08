import type { Router } from 'express';

export interface ModuleContext {
  db: unknown;
  orgId?: string;
  userId?: string;
  agentId?: string;
  emit?: (room: string, event: string, data: unknown) => void;
}

export interface PermissionDefinition {
  code: string;
  module: string;
  resource: string;
  action: string;
  description: string;
}

export interface NavigationItem {
  label: string;
  icon: string;
  path: string;
  children?: NavigationItem[];
  requiredPermission?: string;
}

export interface ModuleRoute {
  path: string;
  component: string;
}

export interface EntityTypeDefinition {
  key: string;
  label: string;
  pluralLabel: string;
  supportsCustomFields: boolean;
  supportsNotes?: boolean;
  supportsActivities?: boolean;
  supportsChat?: boolean;
}

export interface ModuleManifest {
  key: string;
  name: string;
  description: string;
  version: string;
  dependencies?: string[];
  createRouter?: (ctx: ModuleContext) => Router;
  permissions?: PermissionDefinition[];
  navigation?: NavigationItem[];
  routes?: ModuleRoute[];
  entityTypes?: EntityTypeDefinition[];
  seedOrgDefaults?: (ctx: ModuleContext, orgId: string) => Promise<void>;
}
