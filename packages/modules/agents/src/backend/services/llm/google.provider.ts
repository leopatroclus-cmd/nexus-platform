import { GoogleGenerativeAI, type FunctionDeclaration, type Content, SchemaType } from '@google/generative-ai';
import type { LLMClientInterface, LLMMessage, LLMResponse, LLMClientOptions, ToolDefinition, StreamChunk, ToolCall } from './types.js';

export class GoogleProvider implements LLMClientInterface {
  private genai: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.genai = new GoogleGenerativeAI(apiKey);
  }

  async sendMessage(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
    options?: LLMClientOptions,
  ): Promise<LLMResponse> {
    const { systemInstruction, contents } = this.convertMessages(messages);
    const model = this.genai.getGenerativeModel({
      model: options?.model || 'gemini-2.0-flash',
      systemInstruction: systemInstruction || undefined,
    });

    const generateOptions: any = {};
    if (options?.maxTokens) generateOptions.maxOutputTokens = options.maxTokens;
    if (options?.temperature !== undefined) generateOptions.temperature = options.temperature;

    const toolDecls = tools?.length ? this.convertTools(tools) : undefined;

    const result = await model.generateContent({
      contents,
      tools: toolDecls ? [{ functionDeclarations: toolDecls }] : undefined,
      generationConfig: generateOptions,
    });

    const response = result.response;
    let content = '';
    const toolCalls: ToolCall[] = [];

    for (const candidate of response.candidates || []) {
      for (const part of candidate.content.parts) {
        if (part.text) {
          content += part.text;
        } else if (part.functionCall) {
          toolCalls.push({
            id: `call_${Math.random().toString(36).slice(2)}`,
            name: part.functionCall.name,
            arguments: (part.functionCall.args || {}) as Record<string, unknown>,
          });
        }
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      finishReason: toolCalls.length > 0 ? 'tool_use' : 'end_turn',
      usage: response.usageMetadata ? {
        inputTokens: response.usageMetadata.promptTokenCount || 0,
        outputTokens: response.usageMetadata.candidatesTokenCount || 0,
      } : undefined,
    };
  }

  async *streamMessage(
    messages: LLMMessage[],
    tools?: ToolDefinition[],
    options?: LLMClientOptions,
  ): AsyncIterable<StreamChunk> {
    const { systemInstruction, contents } = this.convertMessages(messages);
    const model = this.genai.getGenerativeModel({
      model: options?.model || 'gemini-2.0-flash',
      systemInstruction: systemInstruction || undefined,
    });

    const generateOptions: any = {};
    if (options?.maxTokens) generateOptions.maxOutputTokens = options.maxTokens;
    if (options?.temperature !== undefined) generateOptions.temperature = options.temperature;

    const toolDecls = tools?.length ? this.convertTools(tools) : undefined;

    const result = await model.generateContentStream({
      contents,
      tools: toolDecls ? [{ functionDeclarations: toolDecls }] : undefined,
      generationConfig: generateOptions,
    });

    for await (const chunk of result.stream) {
      for (const candidate of chunk.candidates || []) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            yield { type: 'text_delta', text: part.text };
          } else if (part.functionCall) {
            const toolCall: Partial<ToolCall> = {
              id: `call_${Math.random().toString(36).slice(2)}`,
              name: part.functionCall.name,
              arguments: (part.functionCall.args || {}) as Record<string, unknown>,
            };
            yield { type: 'tool_call_start', toolCall };
            yield { type: 'tool_call_end', toolCall };
          }
        }
      }
    }

    yield { type: 'done' };
  }

  private convertMessages(messages: LLMMessage[]): {
    systemInstruction: string | null;
    contents: Content[];
  } {
    let systemInstruction: string | null = null;
    const contents: Content[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction = msg.content;
      } else if (msg.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant') {
        const parts: any[] = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.toolCalls) {
          for (const tc of msg.toolCalls) {
            parts.push({ functionCall: { name: tc.name, args: tc.arguments } });
          }
        }
        contents.push({ role: 'model', parts });
      } else if (msg.role === 'tool') {
        contents.push({
          role: 'function',
          parts: [{
            functionResponse: {
              name: msg.toolCallId || 'unknown',
              response: { result: msg.content },
            },
          }],
        });
      }
    }

    return { systemInstruction, contents };
  }

  private convertTools(tools: ToolDefinition[]): FunctionDeclaration[] {
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: this.convertJsonSchemaToGemini(t.parameters),
    }));
  }

  private convertJsonSchemaToGemini(schema: Record<string, unknown>): any {
    if (!schema || !schema.type) {
      return { type: SchemaType.OBJECT, properties: {} };
    }

    const result: any = {};
    const type = schema.type as string;
    switch (type) {
      case 'object': result.type = SchemaType.OBJECT; break;
      case 'string': result.type = SchemaType.STRING; break;
      case 'number': result.type = SchemaType.NUMBER; break;
      case 'integer': result.type = SchemaType.INTEGER; break;
      case 'boolean': result.type = SchemaType.BOOLEAN; break;
      case 'array': result.type = SchemaType.ARRAY; break;
      default: result.type = SchemaType.STRING;
    }

    if (schema.description) result.description = schema.description;
    if (schema.properties) {
      result.properties = {};
      for (const [k, v] of Object.entries(schema.properties as Record<string, unknown>)) {
        result.properties[k] = this.convertJsonSchemaToGemini(v as Record<string, unknown>);
      }
    }
    if (schema.required) result.required = schema.required;
    if (schema.items) result.items = this.convertJsonSchemaToGemini(schema.items as Record<string, unknown>);
    if (schema.enum) result.enum = schema.enum;

    return result;
  }
}
