import Anthropic from '@anthropic-ai/sdk';
import type { LLMClientInterface, LLMMessage, LLMResponse, LLMClientOptions, ToolDefinition, StreamChunk, ToolCall } from './types.js';

export class AnthropicProvider implements LLMClientInterface {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async sendMessage(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
    options?: LLMClientOptions,
  ): Promise<LLMResponse> {
    const { systemPrompt, anthropicMessages } = this.convertMessages(messages);

    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model: options?.model || 'claude-sonnet-4-20250514',
      max_tokens: options?.maxTokens || 4096,
      messages: anthropicMessages,
    };

    if (systemPrompt) params.system = systemPrompt;
    if (options?.temperature !== undefined) params.temperature = options.temperature;
    if (tools?.length) {
      params.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool['input_schema'],
      }));
    }

    const response = await this.client.messages.create(params);

    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        content += block.text;
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: response.stop_reason === 'tool_use' ? 'tool_use' : 'end_turn',
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  }

  async *streamMessage(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
    options?: LLMClientOptions,
  ): AsyncIterable<StreamChunk> {
    const { systemPrompt, anthropicMessages } = this.convertMessages(messages);

    const params: Anthropic.MessageCreateParamsStreaming = {
      model: options?.model || 'claude-sonnet-4-20250514',
      max_tokens: options?.maxTokens || 4096,
      messages: anthropicMessages,
      stream: true,
    };

    if (systemPrompt) params.system = systemPrompt;
    if (options?.temperature !== undefined) params.temperature = options.temperature;
    if (tools?.length) {
      params.tools = tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters as Anthropic.Tool['input_schema'],
      }));
    }

    const stream = this.client.messages.stream(params);

    let currentToolCall: Partial<ToolCall> | null = null;
    let toolInputJson = '';

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        const block = event.content_block;
        if (block.type === 'tool_use') {
          currentToolCall = { id: block.id, name: block.name };
          toolInputJson = '';
          yield { type: 'tool_call_start', toolCall: currentToolCall };
        }
      } else if (event.type === 'content_block_delta') {
        const delta = event.delta;
        if (delta.type === 'text_delta') {
          yield { type: 'text_delta', text: delta.text };
        } else if (delta.type === 'input_json_delta') {
          toolInputJson += delta.partial_json;
          yield { type: 'tool_call_delta', toolCall: currentToolCall || undefined };
        }
      } else if (event.type === 'content_block_stop') {
        if (currentToolCall) {
          try {
            currentToolCall.arguments = JSON.parse(toolInputJson || '{}');
          } catch {
            currentToolCall.arguments = {};
          }
          yield { type: 'tool_call_end', toolCall: currentToolCall as Partial<ToolCall> };
          currentToolCall = null;
          toolInputJson = '';
        }
      } else if (event.type === 'message_stop') {
        yield { type: 'done' };
      }
    }
  }

  private convertMessages(messages: LLMMessage[]): {
    systemPrompt: string | undefined;
    anthropicMessages: Anthropic.MessageParam[];
  } {
    let systemPrompt: string | undefined;
    const anthropicMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt = msg.content;
      } else if (msg.role === 'user') {
        anthropicMessages.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        const content: Anthropic.ContentBlockParam[] = [];
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            content.push({ type: 'tool_use', id: tc.id, name: tc.name, input: tc.arguments });
          }
        }
        anthropicMessages.push({ role: 'assistant', content });
      } else if (msg.role === 'tool') {
        anthropicMessages.push({
          role: 'user',
          content: [{
            type: 'tool_result',
            tool_use_id: msg.toolCallId!,
            content: msg.content,
          }],
        });
      }
    }

    return { systemPrompt, anthropicMessages };
  }
}
