import { AIServiceProvider, CodeGenerationRequest } from '../types/ai-service';

interface ClaudeConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export class ClaudeProvider implements AIServiceProvider {
  private config: Required<ClaudeConfig>;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(config: ClaudeConfig) {
    this.config = {
      model: 'claude-3-opus-20240229',
      maxTokens: 4000,
      temperature: 0.7,
      ...config,
    };
  }

  async generateCode(request: CodeGenerationRequest): Promise<{ code: string }> {
    const { prompt, context, maxTokens, temperature } = request;
    
    // Build system prompt with context
    let systemPrompt = 'You are an expert TypeScript/React developer. ' +
      'Generate clean, efficient, and well-documented code. ' +
      'Only respond with the code block, no explanations or markdown formatting.';

    if (context?.files?.length) {
      systemPrompt += '\n\nContext from other files has been provided. ' +
        'Use this information to ensure your implementation is consistent with the project.';
    }

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: maxTokens || this.config.maxTokens,
          temperature: temperature ?? this.config.temperature,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: this.buildPrompt(prompt, context),
            },
          ],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          `Claude API error: ${response.status} ${response.statusText} - ${JSON.stringify(error)}`
        );
      }

      const data = await response.json();
      const code = data.content?.[0]?.text?.trim() || '';
      
      // Clean up the response (remove markdown code blocks if present)
      const cleanCode = code.replace(/^```(?:typescript|tsx|jsx)?\n|```$/g, '').trim();
      
      return { code: cleanCode };
    } catch (error) {
      console.error('Claude API request failed:', error);
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
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
