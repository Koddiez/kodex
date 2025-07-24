export interface AIServiceProvider {
  name: string
  isAvailable(): Promise<boolean>
  generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult>
  analyzeCode(request: CodeAnalysisRequest): Promise<CodeAnalysisResult>
  explainCode(request: CodeExplanationRequest): Promise<CodeExplanationResult>
  suggestImprovements(request: ImprovementRequest): Promise<ImprovementResult>
}

export interface CodeGenerationRequest {
  prompt: string
  type: CodeGenerationType
  context: ProjectContext
  constraints?: GenerationConstraints
  preferences?: UserPreferences
}

export type CodeGenerationType = 
  | 'component' 
  | 'page' 
  | 'feature' 
  | 'api' 
  | 'test' 
  | 'full-app'
  | 'utility'
  | 'hook'

export interface ProjectContext {
  framework: string
  language: string
  existingFiles: ProjectFile[]
  dependencies: string[]
  projectStructure: string[]
  currentFile?: string
  selectedCode?: string
}

export interface GenerationConstraints {
  maxFiles?: number
  maxLinesPerFile?: number
  includeTests?: boolean
  includeDocumentation?: boolean
  styleGuide?: string
  accessibility?: boolean
  responsive?: boolean
}

export interface UserPreferences {
  codeStyle: 'functional' | 'class-based' | 'mixed'
  testingFramework: 'jest' | 'vitest' | 'cypress'
  cssFramework: 'tailwind' | 'styled-components' | 'css-modules' | 'emotion'
  stateManagement: 'useState' | 'zustand' | 'redux' | 'context'
  typescript: boolean
}

export interface CodeGenerationResult {
  success: boolean
  files: GeneratedFile[]
  explanation: string
  suggestions: string[]
  dependencies: string[]
  tests?: GeneratedFile[]
  error?: string
  provider: string
  usage: {
    tokensUsed: number
    cost?: number
    duration: number
  }
}

export interface GeneratedFile {
  path: string
  content: string
  language: string
  description: string
  dependencies?: string[]
}

export interface CodeAnalysisRequest {
  code: string
  language: string
  filePath: string
  context?: ProjectContext
}

export interface CodeAnalysisResult {
  success: boolean
  issues: CodeIssue[]
  suggestions: CodeSuggestion[]
  complexity: ComplexityMetrics
  dependencies: string[]
  exports: string[]
  imports: string[]
  error?: string
  provider: string
}

export interface CodeIssue {
  type: 'error' | 'warning' | 'info'
  message: string
  line: number
  column: number
  severity: 'high' | 'medium' | 'low'
  fixable: boolean
  suggestedFix?: string
}

export interface CodeSuggestion {
  type: 'performance' | 'security' | 'maintainability' | 'accessibility' | 'best-practice'
  message: string
  line?: number
  column?: number
  before?: string
  after?: string
  impact: 'high' | 'medium' | 'low'
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number
  linesOfCode: number
  maintainabilityIndex: number
  technicalDebt: number
}

export interface CodeExplanationRequest {
  code: string
  language: string
  context?: string
  level: 'beginner' | 'intermediate' | 'advanced'
}

export interface CodeExplanationResult {
  success: boolean
  explanation: string
  breakdown: CodeBreakdown[]
  concepts: string[]
  relatedTopics: string[]
  error?: string
  provider: string
}

export interface CodeBreakdown {
  section: string
  explanation: string
  line?: number
  importance: 'high' | 'medium' | 'low'
}

export interface ImprovementRequest {
  code: string
  language: string
  filePath: string
  focus?: ImprovementFocus[]
  context?: ProjectContext
}

export type ImprovementFocus = 
  | 'performance'
  | 'security'
  | 'accessibility'
  | 'maintainability'
  | 'testing'
  | 'documentation'

export interface ImprovementResult {
  success: boolean
  improvements: Improvement[]
  refactoredCode?: string
  impact: ImprovementImpact
  error?: string
  provider: string
}

export interface Improvement {
  type: ImprovementFocus
  description: string
  before: string
  after: string
  line?: number
  impact: 'high' | 'medium' | 'low'
  effort: 'low' | 'medium' | 'high'
  reasoning: string
}

export interface ImprovementImpact {
  performance: number // 0-100
  maintainability: number // 0-100
  security: number // 0-100
  accessibility: number // 0-100
  overall: number // 0-100
}

export interface AIServiceConfig {
  providers: {
    claude?: {
      apiKey: string
      model: string
      maxTokens: number
      temperature: number
    }
    openai?: {
      apiKey: string
      model: string
      maxTokens: number
      temperature: number
    }
    fallback?: {
      enabled: boolean
      templates: Record<string, string>
    }
  }
  rateLimiting: {
    requestsPerMinute: number
    requestsPerHour: number
    requestsPerDay: number
  }
  queue: {
    maxSize: number
    timeout: number
    retries: number
  }
  caching: {
    enabled: boolean
    ttl: number
    maxSize: number
  }
}

export interface AIServiceMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageResponseTime: number
  tokensUsed: number
  cost: number
  providerUsage: Record<string, number>
  errorsByType: Record<string, number>
}

export interface ProjectFile {
  id: string
  name: string
  path: string
  content: string
  language: string
  size: number
  lastModified: Date
}