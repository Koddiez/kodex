import { AIServiceProvider, CodeGenerationRequest } from '../types/ai-service';
import { validateTypeScript } from './validation';

interface ProviderMetrics {
  successRate: number;
  avgResponseTime: number;
  costPerToken: number;
  lastUsed: number;
  errorCount: number;
  totalRequests: number;
}

export class AIOrchestrator {
  private providers: Map<string, AIServiceProvider> = new Map();
  private metrics: Map<string, ProviderMetrics> = new Map();
  private budget: number = 100; // Default budget
  private maxParallel: number;

  constructor(options: { maxParallel?: number } = {}) {
    this.maxParallel = options.maxParallel || 3;
  }

  registerProvider(name: string, provider: AIServiceProvider, costPerToken: number) {
    this.providers.set(name, provider);
    this.metrics.set(name, {
      successRate: 1.0,
      avgResponseTime: 0,
      costPerToken,
      lastUsed: 0,
      errorCount: 0,
      totalRequests: 0,
    });
  }

  setBudget(budget: number) {
    this.budget = budget;
  }

  private selectProvider(): string | null {
    let bestProvider: string | null = null;
    let bestScore = -Infinity;
    const now = Date.now();

    for (const [name, metrics] of this.metrics.entries()) {
      // Skip if provider is too expensive
      if (metrics.costPerToken > this.budget) continue;

      // Calculate recency bias (prefer recently used but not too frequently)
      const minutesSinceLastUse = (now - metrics.lastUsed) / (60 * 1000);
      const recencyBias = Math.min(Math.log2(minutesSinceLastUse + 1), 5);

      // Calculate reliability score (higher is better)
      const reliability = metrics.successRate ** 2; // Square to favor higher success rates
      
      // Calculate speed factor (faster is better, but with diminishing returns)
      const speedFactor = 1 / (1 + metrics.avgResponseTime / 1000);
      
      // Calculate cost factor (cheaper is better, but not the only factor)
      const costFactor = 1 / (1 + 10 * metrics.costPerToken);

      // Combine factors with weights
      const score = 
        (reliability * 0.4) + 
        (speedFactor * 0.3) + 
        (costFactor * 0.2) + 
        (recencyBias * 0.1);

      if (score > bestScore) {
        bestScore = score;
        bestProvider = name;
      }
    }

    return bestProvider;
  }

  private async executeWithProvider<T>(
    providerName: string,
    executeFn: (provider: AIServiceProvider) => Promise<T>
  ): Promise<{ result: T; provider: string; duration: number }> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} not found`);
    }

    const metrics = this.metrics.get(providerName)!;
    const startTime = Date.now();
    metrics.totalRequests++;

    try {
      const result = await executeFn(provider);
      const duration = Date.now() - startTime;
      
      // Update metrics on success
      metrics.avgResponseTime = 
        (metrics.avgResponseTime * (metrics.totalRequests - 1) + duration) / 
        metrics.totalRequests;
      metrics.lastUsed = Date.now();
      metrics.successRate = 
        ((metrics.totalRequests - metrics.errorCount) / metrics.totalRequests) * 0.9 + 0.1; // Smoothing
      
      return { result, provider: providerName, duration };
    } catch (error) {
      // Update error metrics
      metrics.errorCount++;
      metrics.successRate = (metrics.totalRequests - metrics.errorCount) / metrics.totalRequests;
      throw error;
    }
  }

  async generateCode(
    request: CodeGenerationRequest,
    options: { validate?: boolean } = { validate: true }
  ): Promise<{ code: string; provider: string; metrics: ProviderMetrics }> {
    const providerName = this.selectProvider();
    if (!providerName) {
      throw new Error('No suitable provider available within budget');
    }

    try {
      const { result, provider, duration } = await this.executeWithProvider(
        providerName,
        async (p) => p.generateCode(request)
      );

      // Calculate token count (approximate)
      const tokenCount = result.code.split(/\s+/).length;
      const metrics = this.metrics.get(provider)!;
      
      // Update budget
      const cost = tokenCount * metrics.costPerToken;
      this.budget -= cost;

      // Validate code if requested
      if (options.validate !== false) {
        const isValid = await validateTypeScript(result.code);
        if (!isValid) {
          throw new Error('Generated code failed validation');
        }
      }

      return {
        code: result.code,
        provider,
        metrics: { ...metrics },
      };
    } catch (error) {
      console.error(`Generation failed with ${providerName}:`, error);
      throw error;
    }
  }

  async generateWithFallback(
    request: CodeGenerationRequest,
    options: { maxAttempts?: number; validate?: boolean } = {}
  ): Promise<{ code: string; provider: string; attempts: number }> {
    const maxAttempts = options.maxAttempts || 2;
    const usedProviders = new Set<string>();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const providerName = this.selectProvider();
      if (!providerName || usedProviders.has(providerName)) {
        continue; // Skip if no provider or already tried
      }

      usedProviders.add(providerName);

      try {
        const result = await this.generateCode(request, { validate: options.validate });
        return { ...result, attempts: attempt + 1 };
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} with ${providerName} failed:`, error);
        lastError = error as Error;
      }
    }

    throw lastError || new Error('All generation attempts failed');
  }

  async generateInParallel(
    request: CodeGenerationRequest,
    options: { count?: number; validate?: boolean } = {}
  ): Promise<Array<{ code: string; provider: string; metrics: ProviderMetrics }>> {
    const count = Math.min(options.count || 2, this.maxParallel);
    const providers = Array.from(this.providers.keys())
      .filter(name => {
        const metrics = this.metrics.get(name)!;
        return metrics.costPerToken <= this.budget;
      })
      .slice(0, count);

    if (providers.length === 0) {
      throw new Error('No suitable providers available within budget');
    }

    const promises = providers.map(providerName =>
      this.executeWithProvider(
        providerName,
        async (p) => p.generateCode(request)
      )
      .then(({ result, provider, duration }) => ({
        code: result.code,
        provider,
        metrics: { ...this.metrics.get(provider)! },
        duration
      }))
      .catch(error => ({
        error,
        provider: providerName,
        code: ''
      }))
    );

    const results = await Promise.all(promises);
    const successful = results.filter(r => !('error' in r)) as Array<{
      code: string;
      provider: string;
      metrics: ProviderMetrics;
      duration: number;
    }>;

    // Sort by quality (successful results first, then by duration)
    successful.sort((a, b) => {
      if (a.metrics.successRate !== b.metrics.successRate) {
        return b.metrics.successRate - a.metrics.successRate;
      }
      return a.duration - b.duration;
    });

    // Validate if requested
    if (options.validate !== false) {
      for (const result of successful) {
        try {
          const isValid = await validateTypeScript(result.code);
          if (isValid) {
            return [result]; // Return first valid result
          }
        } catch (error) {
          console.warn(`Validation failed for ${result.provider}:`, error);
        }
      }
      
      // If we get here, no valid results were found
      throw new Error('No valid code generated by any provider');
    }

    return successful;
  }

  getProviderMetrics(providerName: string): ProviderMetrics | undefined {
    return this.metrics.get(providerName);
  }

  getAllMetrics(): Record<string, ProviderMetrics> {
    return Object.fromEntries(this.metrics.entries());
  }
}
