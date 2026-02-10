import { eq, and, desc } from 'drizzle-orm';
import { agents, agentTools, agentActionsLog, messages, conversations } from '@nexus/database';
import type { Database } from '@nexus/database';
import { executeTool } from '../tools/registry.js';
import { executeAgentTurn } from './engine.js';

interface ExecutionContext {
  db: Database;
  emit: (room: string, event: string, data: unknown) => void;
  orgId: string;
  encryptionKey: string;
}

export async function handleApproval(
  ctx: ExecutionContext,
  action: { id: string; agentId: string; action: string; input: any; output: any },
): Promise<void> {
  const input = action.input as { toolCallId: string; arguments: Record<string, unknown>; conversationId: string };
  const conversationId = input.conversationId;

  try {
    // Execute the approved tool
    const result = await executeTool(action.action, ctx.db, ctx.orgId, input.arguments);

    // Update action log with result
    await ctx.db.update(agentActionsLog)
      .set({ output: result as any })
      .where(eq(agentActionsLog.id, action.id));

    // Save result message
    const [msg] = await ctx.db.insert(messages).values({
      orgId: ctx.orgId,
      conversationId,
      senderType: 'agent',
      senderId: action.agentId,
      content: `Action approved and executed: **${action.action}**\n\nResult: ${JSON.stringify(result, null, 2)}`,
      contentType: 'action_result',
      metadata: { actionId: action.id, toolName: action.action, result },
    }).returning();

    ctx.emit(`conv:${conversationId}`, 'new-message', msg);

    // Resume agent — load agent config and continue the conversation
    const [agent] = await ctx.db.select().from(agents)
      .where(eq(agents.id, action.agentId)).limit(1);
    if (!agent) return;

    const toolsList = await ctx.db.select().from(agentTools)
      .where(eq(agentTools.agentId, agent.id));

    // Get conversation history
    const history = await ctx.db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);

    // Resume with a tool result context
    const toolResultMessage = `The action "${action.action}" was approved and executed successfully. Here is the result: ${JSON.stringify(result)}. Please summarize this for the user.`;

    await executeAgentTurn(
      ctx,
      agent,
      toolsList.map((t) => t.toolKey),
      conversationId,
      toolResultMessage,
      history,
    );
  } catch (err: any) {
    // Save error message
    const [msg] = await ctx.db.insert(messages).values({
      orgId: ctx.orgId,
      conversationId,
      senderType: 'agent',
      senderId: action.agentId,
      content: `Action "${action.action}" was approved but failed to execute: ${err.message}`,
      contentType: 'action_result',
      metadata: { actionId: action.id, error: err.message },
    }).returning();

    ctx.emit(`conv:${conversationId}`, 'new-message', msg);
  }
}

export async function handleRejection(
  ctx: ExecutionContext,
  action: { id: string; agentId: string; action: string; input: any },
  reason?: string,
): Promise<void> {
  const input = action.input as { conversationId: string };
  const conversationId = input.conversationId;

  const [msg] = await ctx.db.insert(messages).values({
    orgId: ctx.orgId,
    conversationId,
    senderType: 'agent',
    senderId: action.agentId,
    content: `Action "${action.action}" was rejected${reason ? `: ${reason}` : ''}. Let me know if you'd like to do something else.`,
    contentType: 'action_result',
    metadata: { actionId: action.id, rejected: true, reason },
  }).returning();

  await ctx.db.update(conversations)
    .set({ lastMessageAt: new Date(), updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  ctx.emit(`conv:${conversationId}`, 'new-message', msg);
}
