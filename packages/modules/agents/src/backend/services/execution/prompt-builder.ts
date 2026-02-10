import type { LLMMessage } from '../llm/types.js';

export function buildSystemPrompt(agentConfig: Record<string, unknown>): string {
  const customPrompt = (agentConfig.systemPrompt as string) || '';
  const agentName = (agentConfig.name as string) || 'AI Assistant';

  const basePrompt = `You are ${agentName}, an AI assistant integrated into the Nexus business platform. You have access to CRM and ERP tools to help users manage their business data.

Guidelines:
- Be concise and helpful
- When using tools, explain what you're doing
- For destructive actions (creating orders, etc.), confirm the details before proceeding
- Format data in a clear, readable way
- If you're unsure about something, ask for clarification`;

  if (customPrompt) {
    return `${basePrompt}\n\nAdditional instructions:\n${customPrompt}`;
  }

  return basePrompt;
}

export function conversationToLLMMessages(
  dbMessages: Array<{
    senderType: string;
    senderId: string;
    content: string;
    contentType: string;
    metadata?: unknown;
  }>,
  agentId: string,
): LLMMessage[] {
  const llmMessages: LLMMessage[] = [];

  for (const msg of dbMessages) {
    if (msg.senderType === 'agent' && msg.senderId === agentId) {
      // Agent's own messages
      if (msg.contentType === 'tool_call') {
        const meta = msg.metadata as any;
        llmMessages.push({
          role: 'assistant',
          content: msg.content || '',
          toolCalls: meta?.toolCalls,
        });
      } else {
        llmMessages.push({ role: 'assistant', content: msg.content });
      }
    } else if (msg.contentType === 'tool_result') {
      const meta = msg.metadata as any;
      llmMessages.push({
        role: 'tool',
        content: msg.content,
        toolCallId: meta?.toolCallId,
      });
    } else if (msg.contentType === 'action_request') {
      // Skip action request messages (they're UI-only)
      continue;
    } else {
      // User messages or messages from other participants
      llmMessages.push({ role: 'user', content: msg.content });
    }
  }

  return llmMessages;
}
