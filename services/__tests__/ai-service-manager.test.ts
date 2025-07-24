import { AIServiceManager, getAIServiceManager } from '../ai-service-manager'
import { ClaudeProvider } from '../providers/claude-provider'
import { OpenAIProvider } from '../providers/openai-provider'
import { FallbackProvider } from '../providers/fallback-provider'
import {
  AIServiceConfig,
  CodeGenerationRequest,
  CodeAnalysisRequest,
  CodeExplanationRequest,
  ImprovementRequest
} from '@/types/ai-service'

// Mock the providers
jest.mock('../providers/claude-provider')
jest.mock('../providers/openai-provider')
jest.mock('../providers/fallback-provider')
jest.mock('@/lib/performance-monitor', () => ({
  performanceMonitor: {
    measureAsyncFunction: jest.fn((name, fn) => fn())
  }
}))

const MockedClaudeProvider = ClaudeProvider as jest.MockedClass<typeof ClaudeProvider>
const MockedOpenAIProvider = OpenAIProvider as jest.MockedClass<typeof OpenAIProvider>
const MockedFallbackProvider = FallbackProvider as jest.MockedClass<typeof FallbackProvider>

describe('AIServiceManager', () => {
  let config: AIServiceConfig
  let aiServiceManager: AIServiceManager

  beforeEach(() => {
    jest.clearAllMocks()
    
    config = {
      providers: {
        claude: {
          apiKey: 'test-claude-key',
          model: 'claude-3-5-sonnet-20241022',
          maxTokens: 4000,
          temperature: 0.7
        },
        openai: {
          apiKey: 'test-openai-key',
          model: 'gpt-4',
          maxTokens: 4000,
          temperature: 0.7
        },
        fallback: {
          enabled: true,
          templates: {}
        }
      },
      rateLimiting: {
        requestsPerMinute: 10,
        requestsPerHour: 100,
        requestsPerDay: 1000
      },
      queue: {
        maxSize: 50,
        timeout: 30,
        retries: 3
      },
      caching: {
        enabled: true,
        ttl: 300,
        maxSize: 100
      }
    }

    aiServiceManager = new AIServiceManager(config)
  })

  describe('Provider Initialization', () => {
    it('should initialize all configured providers', () => {
      expect(MockedClaudeProvider).toHaveBeenCalledWith(config.providers.claude)
      expect(MockedOpenAIProvider).toHaveBeenCalledWith(config.providers.openai)
      expect(MockedFallbackProvider).toHaveBeenCalledWith(config.providers.fallback)
    })

    it('should return available providers', () => {
      const providers = aiServiceManager.getAvailableProviders()
      expect(providers).toContain('claude')
      expect(providers).toContain('openai')
      expect(providers).toContain('fallback')
    })
  })

  describe('Provider Selection', () => {
    beforeEach(() => {
      // Mock provider availability
      MockedClaudeProvider.prototype.isAvailable = jest.fn().mockResolvedValue(true)
      MockedOpenAIProvider.prototype.isAvailable = jest.fn().mockResolvedValue(true)
      MockedFallbackProvider.prototype.isAvailable = jest.fn().mockResolvedValue(true)
    })

    it('should select Claude provider for code generation by default', async () => {
      const mockGenerateCode = jest.fn().mockResolvedValue({
        success: true,
        files: [],
        explanation: 'Test',
        suggestions: [],
        dependencies: [],
        provider: 'claude',
        usage: { tokensUsed: 100, duration: 1000 }
      })
      
      MockedClaudeProvider.prototype.generateCode = mockGenerateCode

      const request: CodeGenerationRequest = {
        prompt: 'Create a React component',
        type: 'component',
        context: {
          framework: 'react',
          language: 'typescript',
          existingFiles: [],
          dependencies: [],
          projectStructure: []
        }
      }

      await aiServiceManager.generateCode(request)
      expect(mockGenerateCode).toHaveBeenCalledWith(request)
    })

    it('should fallback to OpenAI when Claude is unavailable', async () => {
      MockedClaudeProvider.prototype.isAvailable = jest.fn().mockResolvedValue(false)
      
      const mockGenerateCode = jest.fn().mockResolvedValue({
        success: true,
        files: [],
        explanation: 'Test',
        suggestions: [],
        dependencies: [],
        provider: 'openai',
        usage: { tokensUsed: 100, duration: 1000 }
      })
      
      MockedOpenAIProvider.prototype.generateCode = mockGenerateCode

      const request: CodeGenerationRequest = {
        prompt: 'Create a React component',
        type: 'component',
        context: {
          framework: 'react',
          language: 'typescript',
          existingFiles: [],
          dependencies: [],
          projectStructure: []
        }
      }

      await aiServiceManager.generateCode(request)
      expect(mockGenerateCode).toHaveBeenCalledWith(request)
    })

    it('should use fallback provider when all AI providers are unavailable', async () => {
      MockedClaudeProvider.prototype.isAvailable = jest.fn().mockResolvedValue(false)
      MockedOpenAIProvider.prototype.isAvailable = jest.fn().mockResolvedValue(false)
      
      const mockGenerateCode = jest.fn().mockResolvedValue({
        success: true,
        files: [],
        explanation: 'Test',
        suggestions: [],
        dependencies: [],
        provider: 'fallback',
        usage: { tokensUsed: 0, duration: 100 }
      })
      
      MockedFallbackProvider.prototype.generateCode = mockGenerateCode

      const request: CodeGenerationRequest = {
        prompt: 'Create a React component',
        type: 'component',
        context: {
          framework: 'react',
          language: 'typescript',
          existingFiles: [],
          dependencies: [],
          projectStructure: []
        }
      }

      await aiServiceManager.generateCode(request)
      expect(mockGenerateCode).toHaveBeenCalledWith(request)
    })
  })

  describe('Rate Limiting', () => {
    beforeEach(() => {
      MockedClaudeProvider.prototype.isAvailable = jest.fn().mockResolvedValue(true)
      MockedClaudeProvider.prototype.generateCode = jest.fn().mockResolvedValue({
        success: true,
        files: [],
        explanation: 'Test',
        suggestions: [],
        dependencies: [],
        provider: 'claude',
        usage: { tokensUsed: 100, duration: 1000 }
      })
    })

    it('should allow requests within rate limits', async () => {
      const request: CodeGenerationRequest = {
        prompt: 'Create a React component',
        type: 'component',
        context: {
          framework: 'react',
          language: 'typescript',
          existingFiles: [],
          dependencies: [],
          projectStructure: []
        }
      }

      // Should allow first few requests
      for (let i = 0; i < 5; i++) {
        const result = await aiServiceManager.generateCode(request)
        expect(result.success).toBe(true)
      }
    })

    it('should queue requests when rate limit is exceeded', async () => {
      const request: CodeGenerationRequest = {
        prompt: 'Create a React component',
        type: 'component',
        context: {
          framework: 'react',
          language: 'typescript',
          existingFiles: [],
          dependencies: [],
          projectStructure: []
        }
      }

      // Exhaust rate limit
      const promises = []
      for (let i = 0; i < 15; i++) {
        promises.push(aiServiceManager.generateCode(request))
      }

      const results = await Promise.all(promises)
      expect(results.every(r => r.success)).toBe(true)
    })
  })

  describe('Caching', () => {
    beforeEach(() => {
      MockedClaudeProvider.prototype.isAvailable = jest.fn().mockResolvedValue(true)
      MockedClaudeProvider.prototype.generateCode = jest.fn().mockResolvedValue({
        success: true,
        files: [],
        explanation: 'Test',
        suggestions: [],
        dependencies: [],
        provider: 'claude',
        usage: { tokensUsed: 100, duration: 1000 }
      })
    })

    it('should cache and reuse results for identical requests', async () => {
      const request: CodeGenerationRequest = {
        prompt: 'Create a React component',
        type: 'component',
        context: {
          framework: 'react',
          language: 'typescript',
          existingFiles: [],
          dependencies: [],
          projectStructure: []
        }
      }

      // First request should call provider
      await aiServiceManager.generateCode(request)
      expect(MockedClaudeProvider.prototype.generateCode).toHaveBeenCalledTimes(1)

      // Second identical request should use cache
      await aiServiceManager.generateCode(request)
      expect(MockedClaudeProvider.prototype.generateCode).toHaveBeenCalledTimes(1)
    })

    it('should clear cache when requested', async () => {
      const request: CodeGenerationRequest = {
        prompt: 'Create a React component',
        type: 'component',
        context: {
          framework: 'react',
          language: 'typescript',
          existingFiles: [],
          dependencies: [],
          projectStructure: []
        }
      }

      // First request
      await aiServiceManager.generateCode(request)
      expect(MockedClaudeProvider.prototype.generateCode).toHaveBeenCalledTimes(1)

      // Clear cache
      aiServiceManager.clearCache()

      // Second request should call provider again
      await aiServiceManager.generateCode(request)
      expect(MockedClaudeProvider.prototype.generateCode).toHaveBeenCalledTimes(2)
    })
  })

  describe('All AI Service Methods', () => {
    beforeEach(() => {
      MockedClaudeProvider.prototype.isAvailable = jest.fn().mockResolvedValue(true)
    })

    it('should handle code analysis requests', async () => {
      const mockAnalyzeCode = jest.fn().mockResolvedValue({
        success: true,
        issues: [],
        suggestions: [],
        complexity: { cyclomaticComplexity: 1, linesOfCode: 10, maintainabilityIndex: 90, technicalDebt: 0 },
        dependencies: [],
        exports: [],
        imports: [],
        provider: 'claude'
      })
      
      MockedClaudeProvider.prototype.analyzeCode = mockAnalyzeCode

      const request: CodeAnalysisRequest = {
        code: 'const x = 1;',
        language: 'typescript',
        filePath: 'test.ts'
      }

      const result = await aiServiceManager.analyzeCode(request)
      expect(result.success).toBe(true)
      expect(mockAnalyzeCode).toHaveBeenCalledWith(request)
    })

    it('should handle code explanation requests', async () => {
      const mockExplainCode = jest.fn().mockResolvedValue({
        success: true,
        explanation: 'This code declares a constant',
        breakdown: [],
        concepts: [],
        relatedTopics: [],
        provider: 'claude'
      })
      
      MockedClaudeProvider.prototype.explainCode = mockExplainCode

      const request: CodeExplanationRequest = {
        code: 'const x = 1;',
        language: 'typescript',
        level: 'beginner'
      }

      const result = await aiServiceManager.explainCode(request)
      expect(result.success).toBe(true)
      expect(mockExplainCode).toHaveBeenCalledWith(request)
    })

    it('should handle improvement suggestion requests', async () => {
      const mockSuggestImprovements = jest.fn().mockResolvedValue({
        success: true,
        improvements: [],
        impact: { performance: 0, maintainability: 0, security: 0, accessibility: 0, overall: 0 },
        provider: 'claude'
      })
      
      MockedClaudeProvider.prototype.suggestImprovements = mockSuggestImprovements

      const request: ImprovementRequest = {
        code: 'const x = 1;',
        language: 'typescript',
        filePath: 'test.ts'
      }

      const result = await aiServiceManager.suggestImprovements(request)
      expect(result.success).toBe(true)
      expect(mockSuggestImprovements).toHaveBeenCalledWith(request)
    })
  })

  describe('Metrics and Monitoring', () => {
    beforeEach(() => {
      MockedClaudeProvider.prototype.isAvailable = jest.fn().mockResolvedValue(true)
      MockedClaudeProvider.prototype.generateCode = jest.fn().mockResolvedValue({
        success: true,
        files: [],
        explanation: 'Test',
        suggestions: [],
        dependencies: [],
        provider: 'claude',
        usage: { tokensUsed: 100, duration: 1000 }
      })
    })

    it('should track metrics correctly', async () => {
      const request: CodeGenerationRequest = {
        prompt: 'Create a React component',
        type: 'component',
        context: {
          framework: 'react',
          language: 'typescript',
          existingFiles: [],
          dependencies: [],
          projectStructure: []
        }
      }

      await aiServiceManager.generateCode(request)
      
      const metrics = aiServiceManager.getMetrics()
      expect(metrics.totalRequests).toBe(1)
      expect(metrics.successfulRequests).toBe(1)
      expect(metrics.failedRequests).toBe(0)
      expect(metrics.providerUsage.claude).toBe(1)
    })

    it('should reset metrics when requested', async () => {
      const request: CodeGenerationRequest = {
        prompt: 'Create a React component',
        type: 'component',
        context: {
          framework: 'react',
          language: 'typescript',
          existingFiles: [],
          dependencies: [],
          projectStructure: []
        }
      }

      await aiServiceManager.generateCode(request)
      
      let metrics = aiServiceManager.getMetrics()
      expect(metrics.totalRequests).toBe(1)

      aiServiceManager.resetMetrics()
      
      metrics = aiServiceManager.getMetrics()
      expect(metrics.totalRequests).toBe(0)
    })

    it('should get provider status', async () => {
      const status = await aiServiceManager.getProviderStatus()
      expect(status).toHaveProperty('claude')
      expect(status).toHaveProperty('openai')
      expect(status).toHaveProperty('fallback')
    })
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getAIServiceManager()
      const instance2 = getAIServiceManager()
      expect(instance1).toBe(instance2)
    })
  })
})