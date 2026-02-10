import type { Database } from '@nexus/database';
import type { Tool } from './types.js';
import type { ToolDefinition } from '../llm/types.js';
import { crmTools } from './crm-tools.js';
import { erpTools } from './erp-tools.js';
import { analyticsTools } from './analytics-tools.js';

const toolRegistry = new Map<string, Tool>();

// Register all tools
for (const tool of [...crmTools, ...erpTools, ...analyticsTools]) {
  toolRegistry.set(tool.key, tool);
}

export function getToolRegistry(): Map<string, Tool> {
  return toolRegistry;
}

export function getToolsForAgent(agentToolKeys: string[]): Tool[] {
  return agentToolKeys
    .map((key) => toolRegistry.get(key))
    .filter((t): t is Tool => t !== undefined);
}

export function getToolDefinitions(tools: Tool[]): ToolDefinition[] {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

export function getToolDefinitionsForAgent(agentToolKeys: string[]): ToolDefinition[] {
  const tools = getToolsForAgent(agentToolKeys);
  return getToolDefinitions(tools);
}

export function getToolByName(name: string): Tool | undefined {
  for (const tool of toolRegistry.values()) {
    if (tool.name === name) return tool;
  }
  return undefined;
}

export async function executeTool(
  name: string,
  db: Database,
  orgId: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const tool = getToolByName(name);
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return tool.handler(db, orgId, args);
}
