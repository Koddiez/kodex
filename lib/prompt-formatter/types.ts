import { ProjectContext } from '@/types/ai-service';

export type AIModelProvider = 'openai' | 'claude' | 'gemini' | 'anthropic' | 'custom';

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content: string;
  name?: string;
  function_call?: {
    name: string;
    arguments: string;
  };
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemMessage: string | ((context: any) => string);
  userMessage: string | ((input: any, context: any) => string);
  inputVariables: string[];
  outputFormat?: string;
  examples?: Array<{
    input: any;
    context?: any;
    output: string;
  }>;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  providerSettings?: Record<string, any>;
}

export interface PromptOptions {
  modelProvider?: AIModelProvider;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  functions?: Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;
  functionCall?: 'none' | 'auto' | { name: string };
  responseFormat?: 'text' | 'json' | 'markdown' | 'html' | 'javascript' | 'typescript';
  context?: ProjectContext;
  metadata?: Record<string, any>;
}

export interface FormattedPrompt {
  messages: Message[];
  options: PromptOptions;
  tokenCount: number;
  estimatedCost?: number;
  warnings?: string[];
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface Tokenizer {
  encode: (text: string) => number[];
  decode: (tokens: number[]) => string;
  count: (text: string) => number;
  truncate: (text: string, maxTokens: number, fromEnd?: boolean) => string;
}
