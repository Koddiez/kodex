import { ContextAnalysisEngine, ContextAnalysisResult } from './context-analysis-engine';
import { ProjectContext, CodeGenerationRequest, CodeAnalysisRequest, CodeExplanationRequest, ImprovementRequest } from '../types/ai-service';

interface EnhancedContext {
  originalContext: ProjectContext;
  analysis: ContextAnalysisResult;
  enhancedPrompt: string;
  relevantSnippets: Array<{
    content: string;
    filePath: string;
    contextType: string;
    relevanceScore: number;
  }>;
  recommendations: string[];
}

export class ContextEnhancer {
  private analysisEngine: ContextAnalysisEngine;

  constructor(projectRoot: string) {
    this.analysisEngine = new ContextAnalysisEngine(projectRoot);
  }

  public async enhanceCodeGeneration(
    request: CodeGenerationRequest
  ): Promise<EnhancedContext> {
    const { context } = request;
    const analysis = await this.analysisEngine.analyze(context);
    
    // Filter and rank relevant code snippets
    const relevantSnippets = this.getRelevantSnippets(analysis, request);
    
    // Generate enhanced prompt with context
    const enhancedPrompt = this.generateEnhancedPrompt(request, analysis, relevantSnippets);
    
    // Generate recommendations
    const recommendations = this.generateCodeGenRecommendations(analysis, request);
    
    return {
      originalContext: context,
      analysis,
      enhancedPrompt,
      relevantSnippets,
      recommendations,
    };
  }

  public async enhanceCodeAnalysis(
    request: CodeAnalysisRequest
  ): Promise<EnhancedContext> {
    const { context } = request;
    const analysis = await this.analysisEngine.analyze(context);
    
    const relevantSnippets = this.getRelevantSnippets(analysis, request);
    const enhancedPrompt = this.generateEnhancedPrompt(request, analysis, relevantSnippets);
    const recommendations = this.generateAnalysisRecommendations(analysis, request);
    
    return {
      originalContext: context,
      analysis,
      enhancedPrompt,
      relevantSnippets,
      recommendations,
    };
  }

  public async enhanceCodeExplanation(
    request: CodeExplanationRequest
  ): Promise<EnhancedContext> {
    const { context } = request;
    const analysis = await this.analysisEngine.analyze(context);
    
    const relevantSnippets = this.getRelevantSnippets(analysis, request);
    const enhancedPrompt = this.generateEnhancedPrompt(request, analysis, relevantSnippets);
    const recommendations = this.generateExplanationRecommendations(analysis, request);
    
    return {
      originalContext: context,
      analysis,
      enhancedPrompt,
      relevantSnippets,
      recommendations,
    };
  }

  public async enhanceImprovement(
    request: ImprovementRequest
  ): Promise<EnhancedContext> {
    // Create a basic context if none provided
    const context = request.context || {
      framework: 'react',
      language: 'typescript',
      existingFiles: [],
      dependencies: [],
      projectStructure: []
    };
    
    const analysis = await this.analysisEngine.analyze(context);
    
    const relevantSnippets = this.getRelevantSnippets(analysis, request);
    const enhancedPrompt = this.generateEnhancedPrompt(request, analysis, relevantSnippets);
    const recommendations = this.generateImprovementRecommendations(analysis, request);
    
    return {
      originalContext: context,
      analysis,
      enhancedPrompt,
      relevantSnippets,
      recommendations,
    };
  }

  private getRelevantSnippets(
    analysis: ContextAnalysisResult,
    request: CodeGenerationRequest | CodeAnalysisRequest | CodeExplanationRequest | ImprovementRequest
  ) {
    // Implement logic to find relevant code snippets based on the request
    // This is a simplified example - in reality, you'd want to:
    // 1. Analyze the request to understand what's being asked
    // 2. Score snippets based on relevance to the request
    // 3. Return the most relevant snippets
    
    return analysis.codeSnippets
      .map(snippet => ({
        content: snippet.content,
        filePath: snippet.filePath,
        contextType: snippet.contextType,
        relevanceScore: this.calculateRelevanceScore(snippet, request)
      }))
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5); // Return top 5 most relevant snippets
  }

  private calculateRelevanceScore(
    snippet: any,
    request: CodeGenerationRequest | CodeAnalysisRequest | CodeExplanationRequest | ImprovementRequest
  ): number {
    // Implement logic to calculate relevance score
    // This could consider:
    // - Semantic similarity to the request
    // - File location and type
    // - How recently the file was modified
    // - The type of code (component, hook, util, etc.)
    
    let score = 0;
    
    // Example scoring logic (simplified)
    if ('prompt' in request && typeof request.prompt === 'string') {
      const prompt = request.prompt.toLowerCase();
      const content = snippet.content.toLowerCase();
      
      // Basic keyword matching
      const keywords = prompt.split(/\s+/);
      const matches = keywords.filter(kw => content.includes(kw));
      score += matches.length / keywords.length;
      
      // Higher score for components if the request is about UI
      if (snippet.contextType === 'components' && /component|ui|button|form|input|modal/i.test(prompt)) {
        score += 0.5;
      }
      
      // Higher score for hooks if the request is about state or effects
      if (snippet.contextType === 'hooks' && /hook|state|effect|context|reducer/i.test(prompt)) {
        score += 0.5;
      }
    }
    
    return Math.min(1, Math.max(0, score)); // Ensure score is between 0 and 1
  }

  private generateEnhancedPrompt(
    request: CodeGenerationRequest | CodeAnalysisRequest | CodeExplanationRequest | ImprovementRequest,
    analysis: ContextAnalysisResult,
    relevantSnippets: Array<{ content: string; filePath: string; contextType: string; relevanceScore: number }>
  ): string {
    let prompt = '';
    
    // Add project context
    prompt += `## Project Context\n`;
    prompt += `- Framework: ${analysis.framework.name} ${analysis.framework.version || ''}\n`;
    prompt += `- Language: TypeScript/JavaScript\n`;
    prompt += `- Dependencies: ${analysis.dependencies.map(d => d.name).join(', ')}\n\n`;
    
    // Add relevant code snippets
    if (relevantSnippets.length > 0) {
      prompt += `## Relevant Code Snippets\n`;
      relevantSnippets.forEach((snippet, index) => {
        prompt += `### Snippet ${index + 1} (${snippet.contextType}, relevance: ${Math.round(snippet.relevanceScore * 100)}%)\n`;
        prompt += `File: ${snippet.filePath}\n\`\`\`\n${snippet.content}\n\`\`\`\n\n`;
      });
    }
    
    // Add the original request
    prompt += `## Request\n`;
    if ('prompt' in request) {
      prompt += `${request.prompt}\n\n`;
    }
    
    // Add specific instructions based on request type
    if ('type' in request) {
      prompt += `Task Type: ${request.type}\n`;
      if (request.type === 'component') {
        prompt += `Please generate a React component that follows the project's patterns and style.\n`;
      } else if (request.type === 'hook') {
        prompt += `Please generate a custom React hook that follows the project's patterns and style.\n`;
      } else if (request.type === 'api') {
        prompt += `Please generate an API route handler that follows the project's patterns and style.\n`;
      }
    }
    
    // Add style guidelines
    prompt += `\n## Style Guidelines\n`;
    prompt += `- Use ${analysis.style.quoteStyle} quotes\n`;
    prompt += `- Use ${analysis.style.indentation === 'tab' ? 'tabs' : `${analysis.style.indentation} spaces`} for indentation\n`;
    prompt += `- ${analysis.style.semicolon ? 'Include' : 'Omit'} semicolons\n`;
    prompt += `- Use ${analysis.style.lineEnding === 'lf' ? 'LF' : 'CRLF'} line endings\n`;
    
    return prompt;
  }

  private generateCodeGenRecommendations(
    analysis: ContextAnalysisResult,
    request: CodeGenerationRequest
  ): string[] {
    const recommendations: string[] = [];
    
    // Check for similar components
    if (request.type === 'component') {
      const similarComponents = analysis.codePatterns
        .filter(p => p.type === 'component')
        .flatMap(p => p.examples);
      
      if (similarComponents.length > 0) {
        recommendations.push(
          `Consider reusing or extending these similar components: ${similarComponents.join(', ')}`
        );
      }
    }
    
    // Check for utility functions
    const hasUtils = analysis.codePatterns.some(p => p.type === 'util');
    if (hasUtils) {
      recommendations.push(
        'Check the utils directory for reusable utility functions.'
      );
    }
    
    // Check for style consistency
    if (analysis.style) {
      const styleTips = [];
      if (analysis.style.indentation === 2) {
        styleTips.push('2-space indentation');
      }
      if (analysis.style.quoteStyle === 'single') {
        styleTips.push('single quotes');
      }
      if (!analysis.style.semicolon) {
        styleTips.push('no semicolons');
      }
      
      if (styleTips.length > 0) {
        recommendations.push(
          `Follow the project's style: ${styleTips.join(', ')}`
        );
      }
    }
    
    return recommendations;
  }

  private generateAnalysisRecommendations(
    analysis: ContextAnalysisResult,
    request: CodeAnalysisRequest
  ): string[] {
    // Implement analysis-specific recommendations
    return [];
  }

  private generateExplanationRecommendations(
    analysis: ContextAnalysisResult,
    request: CodeExplanationRequest
  ): string[] {
    // Implement explanation-specific recommendations
    return [];
  }

  private generateImprovementRecommendations(
    analysis: ContextAnalysisResult,
    request: ImprovementRequest
  ): string[] {
    // Implement improvement-specific recommendations
    return [];
  }
}

// Singleton instance
let contextEnhancer: ContextEnhancer | null = null;

export function getContextEnhancer(projectRoot: string): ContextEnhancer {
  if (!contextEnhancer) {
    contextEnhancer = new ContextEnhancer(projectRoot);
  }
  return contextEnhancer;
}
