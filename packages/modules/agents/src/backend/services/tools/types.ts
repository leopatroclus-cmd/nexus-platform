import type { Database } from '@nexus/database';

export interface Tool {
  key: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  requiredPermission?: string;
  isDestructive: boolean;
  handler: (db: Database, orgId: string, args: Record<string, unknown>) => Promise<unknown>;
}
