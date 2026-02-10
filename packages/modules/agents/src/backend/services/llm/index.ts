import type { LLMClientInterface } from './types.js';
import { AnthropicProvider } from './anthropic.provider.js';
import { OpenAIProvider } from './openai.provider.js';
import { GoogleProvider } from './google.provider.js';

export function createLLMClient(provider: string, apiKey: string): LLMClientInterface {
  switch (provider) {
    case 'anthropic':
      return new AnthropicProvider(apiKey);
    case 'openai':
      return new OpenAIProvider(apiKey);
    case 'google':
      return new GoogleProvider(apiKey);
    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

export * from './types.js';
