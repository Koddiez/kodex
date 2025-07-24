import { AIServiceProvider, CodeGenerationRequest } from '../types/ai-service';

interface OpenAIConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class OpenAIProvider implements AIServiceProvider {
  private config: Required<OpenAIConfig>;
  private baseUrl = 'https://api.openai.com/v1';

  constructor(config: OpenAIConfig) {
    this.config = {
      model: 'gpt-4',
      maxTokens: 2000,
      temperature: 0.7,
      ...config,
    };
  }

  async generateCode(request: CodeGenerationRequest): Promise<{ code: string }> {
    const { prompt, context, maxTokens, temperature } = request;
    
    // Build system message with context
    let systemMessage = 'You are an expert TypeScript/React developer. ' +
      'Generate clean, efficient, and well-documented code. ' +
      'Only respond with the code block, no explanations or markdown formatting.';

    if (context?.files?.length) {
      systemMessage += '\n\nContext from other files has been provided. ' +
        'Use this information to ensure your implementation is consistent with the project.';
    }

    // Prepare messages
    const messages = [
      { role: 'system' as const, content: systemMessage },
      { role: 'user' as const, content: this.buildPrompt(prompt, context) },
    ];

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages,
          max_tokens: maxTokens || this.config.maxTokens,
          temperature: temperature ?? this.config.temperature,
          stop: ['```'], // Stop at code block end
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `OpenAI API error: ${response.status} ${response.statusText} - ${JSON.stringify(error)}`
        );
      }

      const data = await response.json();
      const code = data.choices[0]?.message?.content?.trim() || '';
      
      // Clean up the response (remove markdown code blocks if present)
      const cleanCode = code.replace(/^```(?:typescript|tsx|jsx)?\n|```$/g, '').trim();
      
      return { code: cleanCode };
    } catch (error) {
      console.error('OpenAI API request failed:', error);
      throw error;
    }
  }

  private buildPrompt(prompt: string, context?: {
    files?: string[];
    language?: string;
    framework?: string;
  }): string {
    let fullPrompt = `Task: ${prompt}\n\n`;

    if (context?.language) {
      fullPrompt += `Language: ${context.language}\n`;
    }
    if (context?.framework) {
      fullPrompt += `Framework: ${context.framework}\n`;
    }

    if (context?.files?.length) {
      fullPrompt += '\nContext from other files:\n';
      for (const file of context.files) {
        // In a real implementation, you would read the file contents here
        fullPrompt += `\nFile: ${file}\n`;
        fullPrompt += '[File content would be included here]\n';
      }
    }

    fullPrompt += '\nGenerated code (only include the code, no explanations or markdown):\n';
    return fullPrompt;
  }

  // Implement interface requirement
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
