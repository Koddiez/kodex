import { BaseEntity } from './common'

export interface DeploymentProvider {
  id: string
  name: string
  type: DeploymentProviderType
  configuration: ProviderConfiguration
  isActive: boolean
  supportedFeatures: DeploymentFeature[]
}

export type DeploymentProviderType = 'vercel' | 'netlify' | 'aws' | 'custom'

export interface ProviderConfiguration {
  apiKey?: string
  apiSecret?: string
  region?: string
  endpoint?: string
  customSettings?: Record<string, unknown>
}

export type DeploymentFeature = 
  | 'custom_domains'
  | 'environment_variables'
  | 'build_logs'
  | 'rollback'
  | 'preview_deployments'
  | 'edge_functions'
  | 'analytics'

export interface Deployment extends BaseEntity {
  projectId: string
  provider: DeploymentProviderType
  environment: DeploymentEnvironment
  status: DeploymentStatus
  url?: string
  previewUrl?: string
  buildId?: string
  buildLogs: BuildLog[]
  errorLogs: ErrorLog[]
  metrics: DeploymentMetrics
  startedAt: Date
  completedAt?: Date
  deployedBy: string
  commit?: GitCommit
  configuration: DeploymentConfiguration
  rollbackTarget?: string
}

export type DeploymentEnvironment = 'development' | 'staging' | 'production'

export type DeploymentStatus = 
  | 'pending'
  | 'queued'
  | 'building'
  | 'deploying'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'skipped'

export interface BuildLog {
  id: string
  timestamp: Date
  level: LogLevel
  message: string
  source: string
  metadata?: Record<string, unknown>
}

export interface ErrorLog {
  id: string
  timestamp: Date
  error: string
  stack?: string
  context?: Record<string, unknown>
  resolved: boolean
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface DeploymentMetrics {
  buildTime: number
  deployTime: number
  bundleSize: number
  assetsCount: number
  performanceScore?: number
  lighthouseScore?: LighthouseScore
}

export interface LighthouseScore {
  performance: number
  accessibility: number
  bestPractices: number
  seo: number
  pwa?: number
}

export interface GitCommit {
  hash: string
  message: string
  author: string
  timestamp: Date
  branch: string
  tag?: string
}

export interface DeploymentConfiguration {
  buildCommand?: string
  outputDirectory?: string
  installCommand?: string
  nodeVersion?: string
  environmentVariables: EnvironmentVariable[]
  domains: CustomDomain[]
  redirects: Redirect[]
  headers: Header[]
  functions: EdgeFunction[]
  caching: CachingConfiguration
}

export interface EnvironmentVariable {
  key: string
  value: string
  isSecret: boolean
  environments: DeploymentEnvironment[]
}

export interface CustomDomain {
  domain: string
  isApex: boolean
  isWildcard: boolean
  sslEnabled: boolean
  redirectToHttps: boolean
  status: DomainStatus
  verificationRecord?: DNSRecord
}

export type DomainStatus = 
  | 'pending'
  | 'verifying'
  | 'verified'
  | 'failed'
  | 'expired'

export interface DNSRecord {
  type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX'
  name: string
  value: string
  ttl: number
}

export interface Redirect {
  source: string
  destination: string
  statusCode: number
  permanent: boolean
  conditions?: RedirectCondition[]
}

export interface RedirectCondition {
  type: 'header' | 'query' | 'cookie' | 'country' | 'device'
  key: string
  value: string
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with'
}

export interface Header {
  source: string
  headers: Record<string, string>
  conditions?: HeaderCondition[]
}

export interface HeaderCondition {
  type: 'path' | 'header' | 'query'
  key: string
  value: string
  operator: 'equals' | 'contains' | 'regex'
}

export interface EdgeFunction {
  name: string
  path: string
  runtime: 'nodejs' | 'edge'
  memory: number
  timeout: number
  environment: Record<string, string>
  triggers: FunctionTrigger[]
}

export interface FunctionTrigger {
  type: 'http' | 'cron' | 'webhook'
  path?: string
  method?: string
  schedule?: string
  webhook?: string
}

export interface CachingConfiguration {
  staticAssets: CacheRule
  apiRoutes: CacheRule
  pages: CacheRule
  customRules: CustomCacheRule[]
}

export interface CacheRule {
  enabled: boolean
  maxAge: number
  staleWhileRevalidate?: number
  mustRevalidate: boolean
}

export interface CustomCacheRule extends CacheRule {
  pattern: string
  headers?: Record<string, string>
}

export interface DeploymentHook {
  id: string
  name: string
  url: string
  events: DeploymentEvent[]
  isActive: boolean
  secret?: string
  lastTriggered?: Date
  failureCount: number
}

export type DeploymentEvent = 
  | 'deployment_started'
  | 'deployment_success'
  | 'deployment_failed'
  | 'deployment_cancelled'
  | 'build_started'
  | 'build_success'
  | 'build_failed'

export interface DeploymentAnalytics {
  deploymentId: string
  period: AnalyticsPeriod
  metrics: {
    requests: number
    bandwidth: number
    uniqueVisitors: number
    pageViews: number
    bounceRate: number
    averageSessionDuration: number
    topPages: PageMetric[]
    topCountries: CountryMetric[]
    topReferrers: ReferrerMetric[]
    errorRate: number
    averageResponseTime: number
  }
}

export type AnalyticsPeriod = '1h' | '24h' | '7d' | '30d' | '90d'

export interface PageMetric {
  path: string
  views: number
  uniqueViews: number
  averageTime: number
}

export interface CountryMetric {
  country: string
  countryCode: string
  visitors: number
  percentage: number
}

export interface ReferrerMetric {
  referrer: string
  visitors: number
  percentage: number
}

export interface DeploymentAlert {
  id: string
  deploymentId: string
  type: AlertType
  severity: AlertSeverity
  message: string
  threshold?: number
  currentValue?: number
  triggeredAt: Date
  resolvedAt?: Date
  notificationsSent: string[]
}

export type AlertType = 
  | 'high_error_rate'
  | 'slow_response_time'
  | 'high_bandwidth_usage'
  | 'deployment_failed'
  | 'domain_expiring'
  | 'ssl_expiring'

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical'