import { eq, and } from 'drizzle-orm';
import { messages, conversations, agentActionsLog } from '@nexus/database';
import type { Database } from '@nexus/database';
import { createLLMClient } from '../llm/index.js';
import type { LLMMessage, StreamChunk, ToolCall, LLMClientOptions } from '../llm/types.js';
import { getToolsForAgent, getToolDefinitions, getToolByName, executeTool } from '../tools/registry.js';
import { getDecryptedKey } from '../provider-keys.service.js';
import { buildSystemPrompt, conversationToLLMMessages } from './prompt-builder.js';

const MAX_TOOL_ITERATIONS = 10;

const ANALYTICS_TOOLS = new Set([
  'revenue_analytics', 'top_products', 'invoice_analytics',
  'payment_analytics', 'inventory_analytics', 'deal_pipeline_analytics',
]);

interface ExecutionContext {
  db: Database;
  emit: (room: string, event: string, data: unknown) => void;
  orgId: string;
  encryptionKey: string;
}

export async function executeAgentTurn(
  ctx: ExecutionContext,
  agent: { id: string; name: string; config: any },
  agentToolKeys: string[],
  conversationId: string,
  userMessage: string,
  history: Array<{ senderType: string; senderId: string; content: string; contentType: string; metadata?: unknown }>,
): Promise<void> {
  const config = (agent.config || {}) as Record<string, unknown>;
  const provider = (config.provider as string) || 'anthropic';
  const model = (config.model as string) || undefined;
  const temperature = config.temperature as number | undefined;
  const maxTokens = (config.maxTokens as number) || 4096;
  const requireApproval = (config.requireApproval as boolean) ?? true;

  // Get API key
  const apiKey = await getDecryptedKey(ctx.db, ctx.orgId, provider, ctx.encryptionKey);
  if (!apiKey) {
    await saveAgentMessage(ctx, conversationId, agent.id, 'I cannot respond right now — no API key is configured for my AI provider. Please ask an admin to add one in Settings.');
    return;
  }

  // Create LLM client
  const client = createLLMClient(provider, apiKey);
  const tools = getToolsForAgent(agentToolKeys);
  const toolDefs = getToolDefinitions(tools);

  // Build messages
  const systemPrompt = buildSystemPrompt({ ...config, name: agent.name });
  const llmHistory = conversationToLLMMessages(history, agent.id);
  const llmMessages: LLMMessage[] = [
    { role: 'system', content: systemPrompt },
    ...llmHistory,
    { role: 'user', content: userMessage },
  ];

  const clientOptions: LLMClientOptions = { model: model || 'claude-sonnet-4-20250514', temperature, maxTokens };

  // Emit typing indicator
  ctx.emit(`conv:${conversationId}`, 'agent-typing', { conversationId, agentId: agent.id });

  let iteration = 0;
  let accumulatedText = '';
  const messageId = `stream-${Date.now()}`;

  try {
    while (iteration < MAX_TOOL_ITERATIONS) {
      iteration++;
      accumulatedText = '';
      const completedToolCalls: ToolCall[] = [];

      // Stream the response
      for await (const chunk of client.streamMessage(llmMessages, toolDefs.length > 0 ? toolDefs : undefined, clientOptions)) {
        if (chunk.type === 'text_delta' && chunk.text) {
          accumulatedText += chunk.text;
          ctx.emit(`conv:${conversationId}`, 'message-stream', {
            conversationId,
            agentId: agent.id,
            messageId,
            chunk: chunk.text,
            isComplete: false,
          });
        } else if (chunk.type === 'tool_call_end' && chunk.toolCall) {
          completedToolCalls.push(chunk.toolCall as ToolCall);
          ctx.emit(`conv:${conversationId}`, 'tool-execution', {
            conversationId,
            agentId: agent.id,
            toolName: chunk.toolCall.name,
            status: 'started',
          });
        }
      }

      // No tool calls — we're done
      if (completedToolCalls.length === 0) {
        break;
      }

      // Add assistant message with tool calls to the conversation
      llmMessages.push({
        role: 'assistant',
        content: accumulatedText,
        toolCalls: completedToolCalls,
      });

      // Execute each tool call
      for (const tc of completedToolCalls) {
        const tool = getToolByName(tc.name);

        if (tool?.isDestructive && requireApproval) {
          // Create approval request
          const [actionLog] = await ctx.db.insert(agentActionsLog).values({
            orgId: ctx.orgId,
            agentId: agent.id,
            action: tc.name,
            entityType: 'tool_call',
            input: { toolCallId: tc.id, arguments: tc.arguments, conversationId },
            status: 'pending_approval',
          }).returning();

          // Save action request message
          await ctx.db.insert(messages).values({
            orgId: ctx.orgId,
            conversationId,
            senderType: 'agent',
            senderId: agent.id,
            content: `I need approval to execute: **${tc.name}**\n\nParameters: ${JSON.stringify(tc.arguments, null, 2)}`,
            contentType: 'action_request',
            metadata: { actionId: actionLog.id, toolName: tc.name, toolArgs: tc.arguments, toolCallId: tc.id },
          });

          ctx.emit(`conv:${conversationId}`, 'message-stream', {
            conversationId,
            agentId: agent.id,
            messageId,
            chunk: '',
            isComplete: true,
          });

          ctx.emit(`conv:${conversationId}`, 'agent-typing-stop', { conversationId, agentId: agent.id });
          return; // Pause execution — will be resumed on approval
        }

        // Execute non-destructive tool
        let result: unknown;
        try {
          result = await executeTool(tc.name, ctx.db, ctx.orgId, tc.arguments);
        } catch (err: any) {
          result = { error: err.message };
        }

        const isAnalyticsTool = ANALYTICS_TOOLS.has(tc.name);
        ctx.emit(`conv:${conversationId}`, 'tool-execution', {
          conversationId,
          agentId: agent.id,
          toolName: tc.name,
          status: 'completed',
          ...(isAnalyticsTool ? { toolArgs: tc.arguments, result } : {}),
        });

        // Log the action
        await ctx.db.insert(agentActionsLog).values({
          orgId: ctx.orgId,
          agentId: agent.id,
          action: tc.name,
          entityType: 'tool_call',
          input: { arguments: tc.arguments },
          output: result as any,
          status: 'success',
        });

        // Add tool result to messages
        llmMessages.push({
          role: 'tool',
          content: JSON.stringify(result),
          toolCallId: tc.id,
        });
      }

      // Continue loop — LLM will see tool results and may respond or call more tools
    }

    // Save final message
    if (accumulatedText) {
      await saveAgentMessage(ctx, conversationId, agent.id, accumulatedText);
    }
  } catch (err: any) {
    console.error('[AgentEngine] Error:', err);
    await saveAgentMessage(ctx, conversationId, agent.id, `I encountered an error: ${err.message}. Please try again.`);
  }

  // Signal completion
  ctx.emit(`conv:${conversationId}`, 'message-stream', {
    conversationId,
    agentId: agent.id,
    messageId,
    chunk: '',
    isComplete: true,
  });

  ctx.emit(`conv:${conversationId}`, 'agent-typing-stop', { conversationId, agentId: agent.id });
}

async function saveAgentMessage(
  ctx: ExecutionContext,
  conversationId: string,
  agentId: string,
  content: string,
): Promise<void> {
  const [msg] = await ctx.db.insert(messages).values({
    orgId: ctx.orgId,
    conversationId,
    senderType: 'agent',
    senderId: agentId,
    content,
    contentType: 'text',
  }).returning();

  // Update conversation last message time
  await ctx.db.update(conversations)
    .set({ lastMessageAt: new Date(), updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  // Emit the saved message
  ctx.emit(`conv:${conversationId}`, 'new-message', msg);
  ctx.emit(`org:${ctx.orgId}`, 'conversation-updated', { conversationId, lastMessage: msg });
}
