import { Framework, Language } from './common'
import { ProjectFile } from './project'

export interface AICodeGenerator {
  generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult>
  analyzeCode(code: string, language: Language): Promise<CodeAnalysis>
  suggestImprovements(file: ProjectFile): Promise<Suggestion[]>
  explainCode(code: string, language: Language): Promise<CodeExplanation>
  refactorCode(request: RefactorRequest): Promise<RefactorResult>
}

export interface CodeGenerationRequest {
  prompt: string
  type: GenerationType
  context: ProjectContext
  constraints: GenerationConstraints
  preferences: GenerationPreferences
}

export type GenerationType = 
  | 'component' 
  | 'page' 
  | 'feature' 
  | 'api' 
  | 'test' 
  | 'utility'
  | 'full-app'
  | 'documentation'

export interface ProjectContext {
  framework: Framework
  language: Language
  existingFiles: ProjectFile[]
  dependencies: string[]
  projectStructure: string[]
  codeStyle: CodeStyle
}

export interface GenerationConstraints {
  maxFiles?: number
  maxLinesPerFile?: number
  includeTests: boolean
  includeDocumentation: boolean
  followExistingPatterns: boolean
  accessibility: boolean
  responsive: boolean
}

export interface GenerationPreferences {
  codeStyle: CodeStyle
  namingConvention: NamingConvention
  componentStructure: ComponentStructure
  testingFramework?: TestingFramework
  cssFramework?: CSSFramework
}

export interface CodeStyle {
  indentation: 'spaces' | 'tabs'
  indentSize: number
  quotes: 'single' | 'double'
  semicolons: boolean
  trailingCommas: boolean
  bracketSpacing: boolean
  arrowParens: 'avoid' | 'always'
}

export type NamingConvention = 
  | 'camelCase'
  | 'PascalCase'
  | 'snake_case'
  | 'kebab-case'

export type ComponentStructure = 
  | 'functional'
  | 'class'
  | 'hooks'
  | 'compound'

export type TestingFramework = 
  | 'jest'
  | 'vitest'
  | 'cypress'
  | 'playwright'
  | 'testing-library'

export type CSSFramework = 
  | 'tailwind'
  | 'styled-components'
  | 'emotion'
  | 'css-modules'
  | 'sass'
  | 'vanilla'

export interface CodeGenerationResult {
  files: GeneratedFile[]
  explanation: string
  suggestions: string[]
  dependencies: GeneratedDependency[]
  tests: TestFile[]
  documentation: DocumentationFile[]
  warnings: string[]
}

export interface GeneratedFile {
  path: string
  content: string
  language: Language
  description: string
  isNew: boolean
  changes?: FileChange[]
}

export interface FileChange {
  type: 'addition' | 'modification' | 'deletion'
  lineStart: number
  lineEnd: number
  oldContent?: string
  newContent: string
  description: string
}

export interface GeneratedDependency {
  name: string
  version: string
  type: 'dependency' | 'devDependency'
  reason: string
  optional: boolean
}

export interface TestFile {
  path: string
  content: string
  framework: TestingFramework
  testType: 'unit' | 'integration' | 'e2e'
  coverage: TestCoverage
}

export interface TestCoverage {
  statements: number
  branches: number
  functions: number
  lines: number
}

export interface DocumentationFile {
  path: string
  content: string
  type: 'readme' | 'api' | 'component' | 'guide'
  format: 'markdown' | 'html' | 'json'
}

export interface CodeAnalysis {
  complexity: ComplexityMetrics
  quality: QualityMetrics
  security: SecurityIssue[]
  performance: PerformanceIssue[]
  maintainability: MaintainabilityMetrics
  suggestions: AnalysisSuggestion[]
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number
  cognitiveComplexity: number
  linesOfCode: number
  maintainabilityIndex: number
}

export interface QualityMetrics {
  duplicatedLines: number
  codeSmells: CodeSmell[]
  technicalDebt: TechnicalDebt
  testCoverage: TestCoverage
}

export interface SecurityIssue {
  type: SecurityIssueType
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  line: number
  column: number
  suggestion: string
}

export type SecurityIssueType = 
  | 'xss'
  | 'sql_injection'
  | 'csrf'
  | 'insecure_random'
  | 'hardcoded_secret'
  | 'weak_crypto'

export interface PerformanceIssue {
  type: PerformanceIssueType
  impact: 'low' | 'medium' | 'high'
  description: string
  line: number
  suggestion: string
}

export type PerformanceIssueType = 
  | 'memory_leak'
  | 'inefficient_loop'
  | 'unnecessary_render'
  | 'large_bundle'
  | 'blocking_operation'

export interface MaintainabilityMetrics {
  readabilityScore: number
  documentationCoverage: number
  namingConsistency: number
  structureScore: number
}

export interface CodeSmell {
  type: CodeSmellType
  description: string
  line: number
  severity: 'minor' | 'major' | 'critical'
  suggestion: string
}

export type CodeSmellType = 
  | 'long_method'
  | 'large_class'
  | 'duplicate_code'
  | 'dead_code'
  | 'magic_number'
  | 'god_object'

export interface TechnicalDebt {
  totalMinutes: number
  categories: {
    bugs: number
    vulnerabilities: number
    codeSmells: number
    duplications: number
  }
}

export interface AnalysisSuggestion {
  type: SuggestionType
  priority: 'low' | 'medium' | 'high'
  description: string
  before?: string
  after?: string
  impact: string
}

export type SuggestionType = 
  | 'refactor'
  | 'optimize'
  | 'security'
  | 'style'
  | 'documentation'
  | 'testing'

export interface Suggestion {
  id: string
  type: SuggestionType
  title: string
  description: string
  code?: string
  line?: number
  column?: number
  priority: 'low' | 'medium' | 'high'
  category: 'performance' | 'security' | 'maintainability' | 'style'
  autoFixable: boolean
}

export interface CodeExplanation {
  summary: string
  purpose: string
  functionality: FunctionExplanation[]
  dependencies: string[]
  complexity: 'simple' | 'moderate' | 'complex'
  suggestions: string[]
}

export interface FunctionExplanation {
  name: string
  purpose: string
  parameters: ParameterExplanation[]
  returnValue: string
  sideEffects: string[]
}

export interface ParameterExplanation {
  name: string
  type: string
  description: string
  optional: boolean
}

export interface RefactorRequest {
  code: string
  language: Language
  type: RefactorType
  target?: string
  options: RefactorOptions
}

export type RefactorType = 
  | 'extract_function'
  | 'extract_variable'
  | 'inline_function'
  | 'rename_symbol'
  | 'move_to_file'
  | 'convert_to_arrow'
  | 'add_types'

export interface RefactorOptions {
  preserveComments: boolean
  updateReferences: boolean
  generateTests: boolean
  addDocumentation: boolean
}

export interface RefactorResult {
  originalCode: string
  refactoredCode: string
  changes: RefactorChange[]
  explanation: string
  warnings: string[]
}

export interface RefactorChange {
  type: 'addition' | 'modification' | 'deletion' | 'move'
  description: string
  before?: string
  after?: string
  line: number
  column: number
}