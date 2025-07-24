import { AIServiceManager } from './ai-service-manager';
import { getContextEnhancer } from '@/lib/context-enhancer';
import { 
  CodeGenerationRequest, 
  CodeGenerationResult, 
  CodeAnalysisRequest, 
  CodeAnalysisResult,
  CodeExplanationRequest,
  CodeExplanationResult,
  ImprovementRequest,
  ImprovementResult,
  AIServiceConfig,
  ProjectContext
} from '@/types/ai-service';
import { performance } from 'perf_hooks';

export class EnhancedAIService {
  private aiService: AIServiceManager;
  private contextEnhancer: ReturnType<typeof getContextEnhancer>;
  private projectRoot: string;

  constructor(config: AIServiceConfig, projectRoot: string) {
    this.aiService = new AIServiceManager(config);
    this.contextEnhancer = getContextEnhancer(projectRoot);
    this.projectRoot = projectRoot;
  }

  /**
   * Enhanced code generation with context analysis
   */
  public async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    const startTime = performance.now();
    
    try {
      // 1. Enhance the request with context analysis
      const enhancedContext = await this.contextEnhancer.enhanceCodeGeneration(request);
      
      // 2. Create an enhanced prompt with context
      const enhancedRequest: CodeGenerationRequest = {
        ...request,
        prompt: enhancedContext.enhancedPrompt,
        context: {
          ...request.context,
          // Add relevant snippets to the context
          relevantSnippets: enhancedContext.relevantSnippets.map(s => ({
            content: s.content,
            filePath: s.filePath,
            language: this.getLanguageFromPath(s.filePath)
          })),
        },
      };
      
      // 3. Generate code using the AI service
      const result = await this.aiService.generateCode(enhancedRequest);
      
      // 4. Add context analysis to the result
      return {
        ...result,
        metadata: {
          ...result.metadata,
          contextAnalysis: {
            relevantSnippets: enhancedContext.relevantSnippets,
            recommendations: enhancedContext.recommendations,
            analysisDuration: performance.now() - startTime,
          },
        },
      };
    } catch (error) {
      console.error('Error in enhanced code generation:', error);
      // Fallback to basic generation if enhancement fails
      return this.aiService.generateCode(request);
    }
  }

  /**
   * Enhanced code analysis with context awareness
   */
  public async analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResult> {
    try {
      const enhancedContext = await this.contextEnhancer.enhanceCodeAnalysis(request);
      
      const enhancedRequest: CodeAnalysisRequest = {
        ...request,
        context: {
          ...request.context,
          relevantSnippets: enhancedContext.relevantSnippets.map(s => ({
            content: s.content,
            filePath: s.filePath,
            language: this.getLanguageFromPath(s.filePath)
          })),
          recommendations: enhancedContext.recommendations || []
        }
      };

      // Delegate to the base AI service for the actual analysis
      return this.aiService.analyzeCode(enhancedRequest);
    } catch (error) {
      console.error('Error in enhanced code analysis:', error);
      // Fallback to basic analysis if enhancement fails
      return this.aiService.analyzeCode(request);
    }
  }

  /**
   * Enhanced code explanation with context awareness
   */
  public async explainCode(request: CodeExplanationRequest): Promise<CodeExplanationResult> {
    try {
      const enhancedContext = await this.contextEnhancer.enhanceCodeExplanation(request);
      
      const enhancedRequest: CodeExplanationRequest = {
        ...request,
        context: {
          ...request.context,
          relevantSnippets: enhancedContext.relevantSnippets.map(s => ({
            content: s.content,
            filePath: s.filePath,
            language: this.getLanguageFromPath(s.filePath)
          }))
        }
      };

      return this.aiService.explainCode(enhancedRequest);
    } catch (error) {
      console.error('Error in enhanced code explanation:', error);
      return this.aiService.explainCode(request);
    }
  }

  /**
   * Enhanced code improvement suggestions with context awareness
   */
  public async improveCode(request: ImprovementRequest): Promise<ImprovementResult> {
    try {
      const enhancedContext = await this.contextEnhancer.enhanceCodeImprovement(request);
      
      const enhancedRequest: ImprovementRequest = {
        ...request,
        context: {
          ...request.context,
          relevantSnippets: enhancedContext.relevantSnippets.map(s => ({
            content: s.content,
            filePath: s.filePath,
            language: this.getLanguageFromPath(s.filePath)
          })),
          recommendations: enhancedContext.recommendations || []
        }
      };

      return this.aiService.improveCode(enhancedRequest);
    } catch (error) {
      console.error('Error in enhanced code improvement:', error);
      return this.aiService.improveCode(request);
    }
  }

  /**
   * Helper method to determine language from file path
   */
  private getLanguageFromPath(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'rb': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin',
      'scala': 'scala',
      'sh': 'shell',
      'dockerfile': 'dockerfile',
      'yaml': 'yaml',
      'yml': 'yaml',
      'json': 'json',
      'md': 'markdown',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'sass': 'sass',
      'less': 'less',
      'sql': 'sql',
      'graphql': 'graphql',
      'xml': 'xml'
    };

    return languageMap[extension] || extension;
  }
}
