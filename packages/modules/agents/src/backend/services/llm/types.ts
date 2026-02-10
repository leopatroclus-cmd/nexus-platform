export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export type StreamChunkType = 'text_delta' | 'tool_call_start' | 'tool_call_delta' | 'tool_call_end' | 'done';

export interface StreamChunk {
  type: StreamChunkType;
  text?: string;
  toolCall?: Partial<ToolCall>;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop';
  usage?: { inputTokens: number; outputTokens: number };
}

export interface LLMClientOptions {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMClientInterface {
  sendMessage(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
    options?: LLMClientOptions,
  ): Promise<LLMResponse>;

  streamMessage(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
    options?: LLMClientOptions,
  ): AsyncIterable<StreamChunk>;
}
