/**
 * Application configuration
 */

export const config = {
  // AI Providers
  ai: {
    // Default model configurations
    defaults: {
      maxTokens: 2000,
      temperature: 0.7,
    },
    
    // Rate limiting
    rateLimiting: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
    },
    
    // Caching
    caching: {
      enabled: true,
      ttl: 300, // 5 minutes
      maxSize: 1000,
    },
    
    // Parallel execution
    maxParallelRequests: 3,
  },
  
  // File system
  fileSystem: {
    // File extensions to include in analysis
    includeExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    
    // Directories to exclude
    excludeDirs: [
      'node_modules',
      '.git',
      '.next',
      'dist',
      'build',
      'coverage',
    ],
    
    // Maximum file size to analyze (in bytes)
    maxFileSize: 2 * 1024 * 1024, // 2MB
  },
  
  // Editor settings
  editor: {
    // Default indentation
    tabSize: 2,
    insertSpaces: true,
    
    // Line endings
    eol: '\n',
    
    // Default file encoding
    encoding: 'utf-8',
    
    // Auto-format on save
    formatOnSave: true,
  },
  
  // Logging
  logging: {
    // Log level: 'error' | 'warn' | 'info' | 'debug' | 'trace'
    level: 'info',
    
    // Log file path (set to empty string for console-only)
    file: 'kodex-ai.log',
    
    // Maximum log file size (in bytes)
    maxFileSize: 10 * 1024 * 1024, // 10MB
    
    // Maximum number of log files to keep
    maxFiles: 5,
  },
  
  // Development mode
  dev: process.env.NODE_ENV !== 'production',
};

// Environment variables
const envConfig = {
  // API Keys (loaded from environment variables)
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  
  // Optional: Custom API endpoints
  openaiApiUrl: process.env.OPENAI_API_URL || 'https://api.openai.com/v1',
  anthropicApiUrl: process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1',
  
  // Optional: Proxy configuration
  httpProxy: process.env.HTTP_PROXY || process.env.http_proxy || '',
  httpsProxy: process.env.HTTPS_PROXY || process.env.https_proxy || '',
  noProxy: process.env.NO_PROXY || process.env.no_proxy || '',
};

// Merge environment config with default config
export const fullConfig = {
  ...config,
  env: envConfig,
};

export type Config = typeof fullConfig;
