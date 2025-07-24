import { 
  AIServiceProvider, 
  CodeGenerationRequest, 
  CodeGenerationResult,
  CodeAnalysisRequest,
  CodeAnalysisResult,
  CodeExplanationRequest,
  CodeExplanationResult,
  ImprovementRequest,
  ImprovementResult,
  AIServiceConfig,
  AIServiceMetrics
} from '../types/ai-service'
import { performanceMonitor } from '../lib/performance-monitor'

// Provider implementations
import { ClaudeProvider } from './providers/claude-provider'
import { OpenAIProvider } from './providers/openai-provider'
import { FallbackProvider } from './providers/fallback-provider'

interface QueuedRequest {
  id: string
  request: any
  method: string
  resolve: (value: any) => void
  reject: (error: any) => void
  timestamp: number
  retries: number
  priority: number
}

interface RateLimitTracker {
  requestsPerMinute: number[]
  requestsPerHour: number[]
  requestsPerDay: number[]
  lastReset: {
    minute: number
    hour: number
    day: number
  }
}

export class AIServiceManager {
  private providers: Map<string, AIServiceProvider> = new Map()
  private config: AIServiceConfig
  private metrics: AIServiceMetrics
  private requestQueue: QueuedRequest[] = []
  private isProcessingQueue = false
  private cache: Map<string, { result: any; timestamp: number }> = new Map()
  private rateLimitTracker: RateLimitTracker
  private providerPerformance: Map<string, { avgResponseTime: number; successRate: number; lastUsed: number }> = new Map()

  constructor(config: AIServiceConfig) {
    this.config = config
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      tokensUsed: 0,
      cost: 0,
      providerUsage: {},
      errorsByType: {}
    }

    this.rateLimitTracker = {
      requestsPerMinute: [],
      requestsPerHour: [],
      requestsPerDay: [],
      lastReset: {
        minute: Date.now(),
        hour: Date.now(),
        day: Date.now()
      }
    }

    this.initializeProviders()
    this.startQueueProcessor()
  }

  private initializeProviders() {
    // Initialize Claude provider if configured
    if (this.config.providers.claude) {
      const claudeProvider = new ClaudeProvider(this.config.providers.claude)
      this.providers.set('claude', claudeProvider)
    }

    // Initialize OpenAI provider if configured
    if (this.config.providers.openai) {
      const openaiProvider = new OpenAIProvider(this.config.providers.openai)
      this.providers.set('openai', openaiProvider)
    }

    // Always initialize fallback provider
    if (this.config.providers.fallback?.enabled) {
      const fallbackProvider = new FallbackProvider(this.config.providers.fallback)
      this.providers.set('fallback', fallbackProvider)
    }
  }

  private async selectBestProvider(requestType: string): Promise<AIServiceProvider | null> {
    const availableProviders = []

    // Check provider availability and collect performance data
    for (const [name, provider] of this.providers) {
      try {
        if (await provider.isAvailable()) {
          const performance = this.providerPerformance.get(name) || {
            avgResponseTime: 0,
            successRate: 1,
            lastUsed: 0
          }
          availableProviders.push({ name, provider, performance })
        }
      } catch (error) {
        console.warn(`Provider ${name} is not available:`, error)
        // Update performance metrics for failed availability check
        const performance = this.providerPerformance.get(name) || {
          avgResponseTime: 0,
          successRate: 1,
          lastUsed: 0
        }
        performance.successRate = Math.max(0, performance.successRate - 0.1)
        this.providerPerformance.set(name, performance)
      }
    }

    if (availableProviders.length === 0) {
      return null
    }

    // Intelligent provider selection based on request type, performance, and load balancing
    const providerPreferences = {
      'code-generation': ['claude', 'openai', 'fallback'],
      'code-analysis': ['claude', 'openai', 'fallback'],
      'code-explanation': ['claude', 'openai', 'fallback'],
      'code-improvement': ['claude', 'openai', 'fallback']
    }

    const preferences = providerPreferences[requestType as keyof typeof providerPreferences] || ['claude', 'openai', 'fallback']

    // Score providers based on multiple factors
    const scoredProviders = availableProviders.map(({ name, provider, performance }) => {
      let score = 0
      
      // Base preference score (higher is better)
      const preferenceIndex = preferences.indexOf(name)
      score += preferenceIndex !== -1 ? (preferences.length - preferenceIndex) * 10 : 0
      
      // Performance score (success rate and response time)
      score += performance.successRate * 20
      score -= Math.min(performance.avgResponseTime / 1000, 10) // Penalize slow responses
      
      // Load balancing - prefer less recently used providers
      const timeSinceLastUse = Date.now() - performance.lastUsed
      score += Math.min(timeSinceLastUse / (60 * 1000), 5) // Up to 5 points for not being used recently
      
      // Avoid fallback unless necessary
      if (name === 'fallback' && availableProviders.length > 1) {
        score -= 50
      }

      return { name, provider, score, performance }
    })

    // Sort by score (highest first) and return the best provider
    scoredProviders.sort((a, b) => b.score - a.score)
    const selectedProvider = scoredProviders[0]
    
    if (!selectedProvider) {
      return null
    }
    
    // Update last used timestamp
    selectedProvider.performance.lastUsed = Date.now()
    this.providerPerformance.set(selectedProvider.name, selectedProvider.performance)
    
    return selectedProvider.provider
  }

  private getCacheKey(method: string, request: any): string {
    return `${method}:${JSON.stringify(request)}`
  }

  private getCachedResult(key: string): any | null {
    if (!this.config.caching.enabled) return null

    const cached = this.cache.get(key)
    if (!cached) return null

    const isExpired = Date.now() - cached.timestamp > this.config.caching.ttl * 1000
    if (isExpired) {
      this.cache.delete(key)
      return null
    }

    return cached.result
  }

  private setCachedResult(key: string, result: any): void {
    if (!this.config.caching.enabled) return

    // Clean up cache if it's too large
    if (this.cache.size >= this.config.caching.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now()
    })
  }

  private async executeWithProvider<T>(
    method: string,
    request: any,
    providerMethod: (provider: AIServiceProvider) => Promise<T>
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(method, request)
      const cachedResult = this.getCachedResult(cacheKey)
      if (cachedResult) {
        return cachedResult
      }

      // Select best provider
      const provider = await this.selectBestProvider(method)
      if (!provider) {
        throw new Error('No available AI providers')
      }

      // Execute request with performance tracking
      const result = await performanceMonitor.measureAsyncFunction(
        `ai_${method}`,
        () => providerMethod(provider)
      )

      // Update metrics
      const duration = Date.now() - startTime
      this.updateMetrics(provider.name, duration, true)

      // Cache result
      this.setCachedResult(cacheKey, result)

      return result
    } catch (error) {
      const duration = Date.now() - startTime
      this.updateMetrics('unknown', duration, false, error)
      throw error
    }
  }

  private updateMetrics(providerName: string, duration: number, success: boolean, error?: any): void {
    this.metrics.totalRequests++
    
    if (success) {
      this.metrics.successfulRequests++
    } else {
      this.metrics.failedRequests++
      const errorType = error?.name || 'UnknownError'
      this.metrics.errorsByType[errorType] = (this.metrics.errorsByType[errorType] || 0) + 1
    }

    // Update average response time
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (this.metrics.totalRequests - 1) + duration) / this.metrics.totalRequests

    // Update provider usage
    this.metrics.providerUsage[providerName] = (this.metrics.providerUsage[providerName] || 0) + 1

    // Update provider performance tracking
    this.updateProviderPerformance(providerName, duration, success)
  }

  private updateProviderPerformance(providerName: string, duration: number, success: boolean): void {
    const performance = this.providerPerformance.get(providerName) || {
      avgResponseTime: 0,
      successRate: 1,
      lastUsed: 0
    }

    // Update average response time using exponential moving average
    const alpha = 0.1 // Smoothing factor
    performance.avgResponseTime = performance.avgResponseTime === 0 
      ? duration 
      : (1 - alpha) * performance.avgResponseTime + alpha * duration

    // Update success rate using exponential moving average
    const successValue = success ? 1 : 0
    performance.successRate = (1 - alpha) * performance.successRate + alpha * successValue

    // Ensure success rate stays within bounds
    performance.successRate = Math.max(0, Math.min(1, performance.successRate))

    this.providerPerformance.set(providerName, performance)
  }

  private async addToQueue<T>(method: string, request: any, priority: number = 1): Promise<T> {
    return new Promise((resolve, reject) => {
      const queuedRequest: QueuedRequest = {
        id: `${Date.now()}-${Math.random()}`,
        request,
        method,
        resolve,
        reject,
        timestamp: Date.now(),
        retries: 0,
        priority
      }

      // Insert request based on priority (higher priority first)
      const insertIndex = this.requestQueue.findIndex(req => req.priority < priority)
      if (insertIndex === -1) {
        this.requestQueue.push(queuedRequest)
      } else {
        this.requestQueue.splice(insertIndex, 0, queuedRequest)
      }
    })
  }

  private async startQueueProcessor(): Promise<void> {
    if (this.isProcessingQueue) return

    this.isProcessingQueue = true

    while (true) {
      if (this.requestQueue.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 100))
        continue
      }

      const request = this.requestQueue.shift()!
      
      try {
        // Check if request has timed out
        if (Date.now() - request.timestamp > this.config.queue.timeout * 1000) {
          request.reject(new Error('Request timeout'))
          continue
        }

        let result
        switch (request.method) {
          case 'generateCode':
            result = await this.executeWithProvider(
              'code-generation',
              request.request,
              (provider) => provider.generateCode(request.request)
            )
            break
          case 'analyzeCode':
            result = await this.executeWithProvider(
              'code-analysis',
              request.request,
              (provider) => provider.analyzeCode(request.request)
            )
            break
          case 'explainCode':
            result = await this.executeWithProvider(
              'code-explanation',
              request.request,
              (provider) => provider.explainCode(request.request)
            )
            break
          case 'suggestImprovements':
            result = await this.executeWithProvider(
              'code-improvement',
              request.request,
              (provider) => provider.suggestImprovements(request.request)
            )
            break
          default:
            throw new Error(`Unknown method: ${request.method}`)
        }

        request.resolve(result)
      } catch (error) {
        // Retry logic
        if (request.retries < this.config.queue.retries) {
          request.retries++
          this.requestQueue.unshift(request) // Add back to front of queue
          await new Promise(resolve => setTimeout(resolve, 1000 * request.retries)) // Exponential backoff
        } else {
          request.reject(error)
        }
      }
    }
  }

  // Public API methods
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    // Check rate limiting
    if (!this.checkRateLimit()) {
      return this.addToQueue('generateCode', request)
    }

    return this.executeWithProvider(
      'code-generation',
      request,
      (provider) => provider.generateCode(request)
    )
  }

  async analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResult> {
    if (!this.checkRateLimit()) {
      return this.addToQueue('analyzeCode', request)
    }

    return this.executeWithProvider(
      'code-analysis',
      request,
      (provider) => provider.analyzeCode(request)
    )
  }

  async explainCode(request: CodeExplanationRequest): Promise<CodeExplanationResult> {
    if (!this.checkRateLimit()) {
      return this.addToQueue('explainCode', request)
    }

    return this.executeWithProvider(
      'code-explanation',
      request,
      (provider) => provider.explainCode(request)
    )
  }

  async suggestImprovements(request: ImprovementRequest): Promise<ImprovementResult> {
    if (!this.checkRateLimit()) {
      return this.addToQueue('suggestImprovements', request)
    }

    return this.executeWithProvider(
      'code-improvement',
      request,
      (provider) => provider.suggestImprovements(request)
    )
  }

  private checkRateLimit(): boolean {
    const now = Date.now()
    
    // Reset counters if time windows have passed
    this.resetRateLimitCounters(now)
    
    // Check rate limits for different time windows
    const minuteLimit = this.rateLimitTracker.requestsPerMinute.length < this.config.rateLimiting.requestsPerMinute
    const hourLimit = this.rateLimitTracker.requestsPerHour.length < this.config.rateLimiting.requestsPerHour
    const dayLimit = this.rateLimitTracker.requestsPerDay.length < this.config.rateLimiting.requestsPerDay
    const queueLimit = this.requestQueue.length < this.config.queue.maxSize
    
    if (minuteLimit && hourLimit && dayLimit && queueLimit) {
      // Add timestamp to tracking arrays
      this.rateLimitTracker.requestsPerMinute.push(now)
      this.rateLimitTracker.requestsPerHour.push(now)
      this.rateLimitTracker.requestsPerDay.push(now)
      return true
    }
    
    return false
  }

  private resetRateLimitCounters(now: number): void {
    // Reset minute counter if a minute has passed
    if (now - this.rateLimitTracker.lastReset.minute >= 60 * 1000) {
      this.rateLimitTracker.requestsPerMinute = this.rateLimitTracker.requestsPerMinute.filter(
        timestamp => now - timestamp < 60 * 1000
      )
      this.rateLimitTracker.lastReset.minute = now
    }
    
    // Reset hour counter if an hour has passed
    if (now - this.rateLimitTracker.lastReset.hour >= 60 * 60 * 1000) {
      this.rateLimitTracker.requestsPerHour = this.rateLimitTracker.requestsPerHour.filter(
        timestamp => now - timestamp < 60 * 60 * 1000
      )
      this.rateLimitTracker.lastReset.hour = now
    }
    
    // Reset day counter if a day has passed
    if (now - this.rateLimitTracker.lastReset.day >= 24 * 60 * 60 * 1000) {
      this.rateLimitTracker.requestsPerDay = this.rateLimitTracker.requestsPerDay.filter(
        timestamp => now - timestamp < 24 * 60 * 60 * 1000
      )
      this.rateLimitTracker.lastReset.day = now
    }
  }

  // Utility methods
  getMetrics(): AIServiceMetrics {
    return { ...this.metrics }
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  async getProviderStatus(): Promise<Record<string, boolean>> {
    const status: Record<string, boolean> = {}
    
    for (const [name, provider] of this.providers) {
      try {
        status[name] = await provider.isAvailable()
      } catch {
        status[name] = false
      }
    }

    return status
  }

  clearCache(): void {
    this.cache.clear()
  }

  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      tokensUsed: 0,
      cost: 0,
      providerUsage: {},
      errorsByType: {}
    }
  }
}

// Singleton instance
let aiServiceManager: AIServiceManager | null = null

export function getAIServiceManager(): AIServiceManager {
  if (!aiServiceManager) {
    const providers: AIServiceConfig['providers'] = {}
    
    // Add Claude provider if API key is available
    if (process.env.ANTHROPIC_API_KEY) {
      providers.claude = {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: 'claude-3-5-sonnet-20241022',
        maxTokens: 4000,
        temperature: 0.7
      }
    }
    
    // Add OpenAI provider if API key is available
    if (process.env.OPENAI_API_KEY) {
      providers.openai = {
        apiKey: process.env.OPENAI_API_KEY,
        model: 'gpt-4',
        maxTokens: 4000,
        temperature: 0.7
      }
    }
    
    // Always add fallback provider
    providers.fallback = {
      enabled: true,
      templates: {}
    }

    const config: AIServiceConfig = {
      providers,
      rateLimiting: {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000
      },
      queue: {
        maxSize: 100,
        timeout: 30,
        retries: 3
      },
      caching: {
        enabled: true,
        ttl: 300, // 5 minutes
        maxSize: 1000
      }
    }

    aiServiceManager = new AIServiceManager(config)
  }

  return aiServiceManager
}