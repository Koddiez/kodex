/**
 * Core types for the AI Service system
 */

export interface AIServiceProvider {
  /**
   * Generate code based on the provided request
   */
  generateCode(request: CodeGenerationRequest): Promise<{ code: string }>;
  
  /**
   * Check if the provider is available
   */
  isAvailable(): Promise<boolean>;
}

export interface CodeGenerationRequest {
  /**
   * The prompt describing the code to generate
   */
  prompt: string;
  
  /**
   * Additional context for code generation
   */
  context?: {
    /**
     * List of relevant file paths to include as context
     */
    files?: string[];
    
    /**
     * Programming language for the generated code
     */
    language?: string;
    
    /**
     * Framework or library being used
     */
    framework?: string;
    
    /**
     * Additional metadata or context
     */
    [key: string]: any;
  };
  
  /**
   * Maximum number of tokens to generate
   */
  maxTokens?: number;
  
  /**
   * Temperature for sampling (0-1)
   */
  temperature?: number;
  
  /**
   * Additional provider-specific options
   */
  options?: Record<string, any>;
}

export interface CodeGenerationResult {
  /**
   * The generated code
   */
  code: string;
  
  /**
   * The provider that generated the code
   */
  provider: string;
  
  /**
   * Generation metadata
   */
  metadata?: {
    /**
     * Time taken to generate the code (ms)
     */
    duration: number;
    
    /**
     * Number of tokens used
     */
    tokens: number;
    
    /**
     * Cost of the generation
     */
    cost: number;
    
    /**
     * Additional provider-specific metadata
     */
    [key: string]: any;
  };
}

export interface ProviderMetrics {
  /**
   * Success rate (0-1)
   */
  successRate: number;
  
  /**
   * Average response time in milliseconds
   */
  avgResponseTime: number;
  
  /**
   * Cost per token
   */
  costPerToken: number;
  
  /**
   * Timestamp of last use
   */
  lastUsed: number;
  
  /**
   * Number of errors encountered
   */
  errorCount: number;
  
  /**
   * Total number of requests
   */
  totalRequests: number;
}

export interface CodeContext {
  /**
   * Path to the file
   */
  filePath: string;
  
  /**
   * Programming language
   */
  language: string;
  
  /**
   * List of imported modules
   */
  imports: Array<{
    source: string;
    specifiers: string[];
    isTypeOnly: boolean;
  }>;
  
  /**
   * List of exported symbols
   */
  exports: string[];
  
  /**
   * List of dependencies
   */
  dependencies: string[];
  
  /**
   * Symbol information
   */
  symbols: Array<{
    name: string;
    type: string;
    kind: string;
    start: number;
    end: number;
    docComment?: string;
  }>;
  
  /**
   * File structure information
   */
  structure: {
    type: 'file' | 'directory';
    name: string;
    path: string;
    children?: Array<{
      type: 'file' | 'directory';
      name: string;
      path: string;
    }>;
  };
  
  /**
   * Relationships with other files
   */
  relationships: Array<{
    type: 'import' | 'export' | 'reference' | 'inheritance' | 'composition';
    target: string;
    details?: Record<string, any>;
  }>;
}

/**
 * Configuration for the AI service
 */
export interface AIServiceConfig {
  /**
   * Provider configurations
   */
  providers: {
    openai?: {
      apiKey: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    };
    claude?: {
      apiKey: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    };
  };
  
  /**
   * Rate limiting configuration
   */
  rateLimiting?: {
    requestsPerMinute?: number;
    requestsPerHour?: number;
    requestsPerDay?: number;
  };
  
  /**
   * Caching configuration
   */
  caching?: {
    enabled?: boolean;
    ttl?: number; // Time to live in seconds
    maxSize?: number; // Maximum number of cache entries
  };
  
  /**
   * Default generation parameters
   */
  defaults?: {
    maxTokens?: number;
    temperature?: number;
  };
}
