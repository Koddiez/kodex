// Centralized configuration management system
export interface AppConfig {
  app: {
    name: string
    version: string
    environment: 'development' | 'staging' | 'production'
    url: string
  }
  database: {
    uri: string
    name: string
  }
  auth: {
    secret: string
    url: string
  }
  ai: {
    openai: {
      apiKey: string
    }
    anthropic: {
      apiKey: string
    }
    moonshot: {
      apiKey: string
    }
  }
  analytics: {
    enabled: boolean
    endpoint: string
    retentionDays: number
    sampleRate: number
  }
  performance: {
    monitoring: {
      enabled: boolean
      realTimeInterval: number
      metricsRetention: number
      alertThresholds: {
        responseTime: number
        errorRate: number
        memoryUsage: number
        cpuUsage: number
      }
    }
    webVitals: {
      enabled: boolean
      thresholds: {
        lcp: { good: number; poor: number }
        fid: { good: number; poor: number }
        cls: { good: number; poor: number }
        fcp: { good: number; poor: number }
        ttfb: { good: number; poor: number }
      }
    }
  }
  deployment: {
    providers: {
      vercel: {
        enabled: boolean
        apiKey?: string
      }
      netlify: {
        enabled: boolean
        apiKey?: string
      }
      aws: {
        enabled: boolean
        accessKey?: string
        secretKey?: string
        region?: string
      }
    }
  }
}

// Load configuration from environment variables
export const config: AppConfig = {
  app: {
    name: 'Kodex',
    version: process.env.npm_package_version || '1.0.0',
    environment: (process.env.NODE_ENV as any) || 'development',
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000'
  },
  database: {
    uri: process.env.MONGODB_URI || '',
    name: process.env.MONGODB_DB_NAME || 'kodex'
  },
  auth: {
    secret: process.env.NEXTAUTH_SECRET || '',
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000'
  },
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || ''
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    },
    moonshot: {
      apiKey: process.env.MOONSHOT_API_KEY || ''
    }
  },
  analytics: {
    enabled: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
    endpoint: process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT || '/api/analytics/performance',
    retentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '30'),
    sampleRate: parseFloat(process.env.ANALYTICS_SAMPLE_RATE || '1.0')
  },
  performance: {
    monitoring: {
      enabled: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
      realTimeInterval: parseInt(process.env.PERFORMANCE_MONITORING_INTERVAL || '5000'),
      metricsRetention: parseInt(process.env.PERFORMANCE_METRICS_RETENTION || '1000'),
      alertThresholds: {
        responseTime: parseInt(process.env.ALERT_THRESHOLD_RESPONSE_TIME || '1000'),
        errorRate: parseFloat(process.env.ALERT_THRESHOLD_ERROR_RATE || '5.0'),
        memoryUsage: parseFloat(process.env.ALERT_THRESHOLD_MEMORY || '80.0'),
        cpuUsage: parseFloat(process.env.ALERT_THRESHOLD_CPU || '90.0')
      }
    },
    webVitals: {
      enabled: process.env.NEXT_PUBLIC_ENABLE_WEB_VITALS === 'true' || true,
      thresholds: {
        lcp: { good: 2500, poor: 4000 },
        fid: { good: 100, poor: 300 },
        cls: { good: 0.1, poor: 0.25 },
        fcp: { good: 1800, poor: 3000 },
        ttfb: { good: 800, poor: 1800 }
      }
    }
  },
  deployment: {
    providers: {
      vercel: {
        enabled: process.env.VERCEL_API_KEY ? true : false,
        apiKey: process.env.VERCEL_API_KEY
      },
      netlify: {
        enabled: process.env.NETLIFY_API_KEY ? true : false,
        apiKey: process.env.NETLIFY_API_KEY
      },
      aws: {
        enabled: process.env.AWS_ACCESS_KEY_ID ? true : false,
        accessKey: process.env.AWS_ACCESS_KEY_ID,
        secretKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'us-east-1'
      }
    }
  }
}

// Configuration validation
export function validateConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = []

  // Required environment variables
  if (!config.database.uri) {
    errors.push('MONGODB_URI is required')
  }

  if (!config.auth.secret) {
    errors.push('NEXTAUTH_SECRET is required')
  }

  // AI service validation
  if (!config.ai.openai.apiKey && !config.ai.anthropic.apiKey && !config.ai.moonshot.apiKey) {
    errors.push('At least one AI service API key is required (OpenAI, Anthropic, or Moonshot)')
  }

  // Performance monitoring validation
  if (config.performance.monitoring.enabled) {
    if (config.performance.monitoring.realTimeInterval < 1000) {
      errors.push('Performance monitoring interval should be at least 1000ms')
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

// Get configuration for specific environment
export function getEnvironmentConfig() {
  return {
    isDevelopment: config.app.environment === 'development',
    isProduction: config.app.environment === 'production',
    isStaging: config.app.environment === 'staging'
  }
}

// Export individual config sections for convenience
export const {
  app: appConfig,
  database: databaseConfig,
  auth: authConfig,
  ai: aiConfig,
  analytics: analyticsConfig,
  performance: performanceConfig,
  deployment: deploymentConfig
} = config