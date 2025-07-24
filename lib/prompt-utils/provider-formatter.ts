import { countTokens } from './token-counter';

export type AIModelProvider = 'openai' | 'claude' | 'gemini' | 'custom';

export interface FormatOptions {
  provider: AIModelProvider;
  modelName?: string;
  maxTokens?: number;
  temperature?: number;
  systemMessage?: string;
  userMessage: string;
  context?: Record<string, any>;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface FormattedPrompt {
  messages: Array<{ role: string; content: string }>;
  options: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  tokenCount: number;
}

const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 2000;

export function formatPrompt(options: FormatOptions): FormattedPrompt {
  const {
    provider,
    modelName,
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
    systemMessage = 'You are a helpful AI assistant.',
    userMessage,
    context = {},
    history = [],
  } = options;

  // Get the appropriate model name if not provided
  const model = modelName || getDefaultModel(provider);
  
  // Format messages based on provider
  const messages = formatMessages(provider, {
    systemMessage,
    userMessage,
    context,
    history,
  });

  // Calculate token count
  const tokenCount = messages.reduce((count, msg) => {
    return count + countTokens(msg.content);
  }, 0);

  return {
    messages,
    options: {
      model,
      temperature,
      maxTokens: Math.min(maxTokens, getMaxTokensForModel(model) - tokenCount),
    },
    tokenCount,
  };
}

function formatMessages(
  provider: AIModelProvider,
  {
    systemMessage,
    userMessage,
    context,
    history,
  }: {
    systemMessage: string;
    userMessage: string;
    context: Record<string, any>;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
  }
): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [];

  // Add system message if supported
  if (provider !== 'gemini') {
    messages.push({ role: 'system', content: systemMessage });
  } else {
    // Gemini doesn't support system messages, so we prepend it to the first user message
    userMessage = `${systemMessage}\n\n${userMessage}`;
  }

  // Add conversation history
  history.forEach(({ role, content }) => {
    messages.push({ role, content });
  });

  // Add current user message with context
  const fullUserMessage = Object.keys(context).length > 0
    ? `${userMessage}\n\nContext: ${JSON.stringify(context, null, 2)}`
    : userMessage;

  messages.push({ role: 'user', content: fullUserMessage });

  return messages;
}

function getDefaultModel(provider: AIModelProvider): string {
  switch (provider) {
    case 'openai':
      return 'gpt-4-turbo';
    case 'claude':
      return 'claude-3-opus-20240229';
    case 'gemini':
      return 'gemini-pro';
    default:
      return 'gpt-4-turbo';
  }
}

function getMaxTokensForModel(model: string): number {
  const modelMaxTokens: Record<string, number> = {
    // OpenAI models
    'gpt-4-32k': 32768,
    'gpt-4': 8192,
    'gpt-4-turbo': 128000,
    'gpt-3.5-turbo': 16385,
    // Anthropic models
    'claude-3-opus-20240229': 200000,
    'claude-3-sonnet-20240229': 200000,
    'claude-3-haiku-20240307': 200000,
    'claude-2.1': 100000,
    // Google models
    'gemini-pro': 30720,
  };

  return modelMaxTokens[model] || 8192; // Default to 8k tokens
}

// Helper function to ensure the prompt fits within the model's context window
export function ensurePromptFits(
  prompt: string,
  model: string,
  maxOutputTokens: number = 1024
): string {
  const maxTokens = getMaxTokensForModel(model);
  const availableTokens = maxTokens - maxOutputTokens;
  const promptTokens = countTokens(prompt);

  if (promptTokens <= availableTokens) {
    return prompt;
  }

  // Truncate the prompt if it's too long
  const ratio = availableTokens / promptTokens;
  const maxLength = Math.floor(prompt.length * ratio * 0.9); // 10% buffer
  
  return prompt.slice(0, maxLength) + '... [truncated]';
}
