import OpenAI from 'openai';
import type { LLMClientInterface, LLMMessage, LLMResponse, LLMClientOptions, ToolDefinition, StreamChunk, ToolCall } from './types.js';

export class OpenAIProvider implements LLMClientInterface {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async sendMessage(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
    options?: LLMClientOptions,
  ): Promise<LLMResponse> {
    const openaiMessages = this.convertMessages(messages);

    const params: OpenAI.ChatCompletionCreateParamsNonStreaming = {
      model: options?.model || 'gpt-4o',
      messages: openaiMessages,
      max_tokens: options?.maxTokens || 4096,
    };

    if (options?.temperature !== undefined) params.temperature = options.temperature;
    if (tools?.length) {
      params.tools = tools.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    const response = await this.client.chat.completions.create(params);
    const choice = response.choices[0];

    const toolCalls: ToolCall[] = [];
    if (choice.message.tool_calls) {
      for (const tc of choice.message.tool_calls) {
        toolCalls.push({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments || '{}'),
        });
      }
    }

    return {
      content: choice.message.content || '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: choice.finish_reason === 'tool_calls' ? 'tool_use' : 'end_turn',
      usage: response.usage ? {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
      } : undefined,
    };
  }

  async *streamMessage(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
    options?: LLMClientOptions,
  ): AsyncIterable<StreamChunk> {
    const openaiMessages = this.convertMessages(messages);

    const params: OpenAI.ChatCompletionCreateParamsStreaming = {
      model: options?.model || 'gpt-4o',
      messages: openaiMessages,
      max_tokens: options?.maxTokens || 4096,
      stream: true,
    };

    if (options?.temperature !== undefined) params.temperature = options.temperature;
    if (tools?.length) {
      params.tools = tools.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    const stream = await this.client.chat.completions.create(params);

    const toolCallAccumulators = new Map<number, { id: string; name: string; args: string }>();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        yield { type: 'text_delta', text: delta.content };
      }

      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCallAccumulators.has(tc.index)) {
            toolCallAccumulators.set(tc.index, { id: tc.id || '', name: tc.function?.name || '', args: '' });
            yield { type: 'tool_call_start', toolCall: { id: tc.id, name: tc.function?.name } };
          }
          const acc = toolCallAccumulators.get(tc.index)!;
          if (tc.id) acc.id = tc.id;
          if (tc.function?.name) acc.name = tc.function.name;
          if (tc.function?.arguments) {
            acc.args += tc.function.arguments;
            yield { type: 'tool_call_delta', toolCall: { id: acc.id, name: acc.name } };
          }
        }
      }

      if (chunk.choices[0]?.finish_reason) {
        // Emit tool_call_end for accumulated tool calls
        for (const [, acc] of toolCallAccumulators) {
          let args: Record<string, unknown> = {};
          try { args = JSON.parse(acc.args || '{}'); } catch { /* ignore */ }
          yield { type: 'tool_call_end', toolCall: { id: acc.id, name: acc.name, arguments: args } };
        }
        yield { type: 'done' };
      }
    }
  }

  private convertMessages(messages: LLMMessage[]): OpenAI.ChatCompletionMessageParam[] {
    const result: OpenAI.ChatCompletionMessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        result.push({ role: 'system', content: msg.content });
      } else if (msg.role === 'user') {
        result.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        const assistantMsg: OpenAI.ChatCompletionAssistantMessageParam = { role: 'assistant' };
        if (msg.content) assistantMsg.content = msg.content;
        if (msg.toolCalls) {
          assistantMsg.tool_calls = msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
          }));
        }
        result.push(assistantMsg);
      } else if (msg.role === 'tool') {
        result.push({ role: 'tool', tool_call_id: msg.toolCallId!, content: msg.content });
      }
    }

    return result;
  }
}
