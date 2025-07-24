import { BaseEntity, Framework, BuildTool, PackageManager } from './common'
import { User } from './auth'

export interface Project extends BaseEntity {
  name: string
  description: string
  ownerId: string
  framework: Framework
  buildTool: BuildTool
  packageManager: PackageManager
  template?: Template
  files: ProjectFile[]
  dependencies: Dependency[]
  devDependencies: Dependency[]
  scripts: Record<string, string>
  environment: EnvironmentVariable[]
  collaborators: ProjectCollaborator[]
  deployments: Deployment[]
  settings: ProjectSettings
  isPublic: boolean
  tags: string[]
  lastModifiedAt: Date
  lastModifiedBy: string
}

export interface ProjectFile {
  id: string
  name: string
  path: string
  content: string
  language: string
  size: number
  lastModified: Date
  lastModifiedBy: string
  version: number
  isDirectory: boolean
  children?: ProjectFile[]
}

export interface Dependency {
  name: string
  version: string
  type: 'dependency' | 'devDependency' | 'peerDependency'
  description?: string
  homepage?: string
  repository?: string
}

export interface EnvironmentVariable {
  key: string
  value: string
  description?: string
  isSecret: boolean
  environments: ('development' | 'staging' | 'production')[]
}

export interface ProjectCollaborator {
  userId: string
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar'>
  role: ProjectRole
  permissions: ProjectPermission[]
  invitedAt: Date
  joinedAt?: Date
  invitedBy: string
}

export type ProjectRole = 'owner' | 'admin' | 'editor' | 'viewer'

export type ProjectPermission = 
  | 'read'
  | 'write'
  | 'delete'
  | 'deploy'
  | 'manage_collaborators'
  | 'manage_settings'

export interface ProjectSettings {
  autoSave: boolean
  autoFormat: boolean
  linting: boolean
  typeChecking: boolean
  hotReload: boolean
  previewMode: 'iframe' | 'new-tab'
  buildOnSave: boolean
  deployOnPush: boolean
}

export interface Template {
  id: string
  name: string
  description: string
  category: TemplateCategory
  framework: Framework
  files: TemplateFile[]
  dependencies: Dependency[]
  devDependencies: Dependency[]
  scripts: Record<string, string>
  configuration: TemplateConfiguration
  preview: string
  screenshots: string[]
  tags: string[]
  authorId: string
  author: Pick<User, 'id' | 'name' | 'avatar'>
  isOfficial: boolean
  isPublic: boolean
  downloads: number
  rating: number
  reviews: TemplateReview[]
  createdAt: Date
  updatedAt: Date
}

export type TemplateCategory = 
  | 'starter'
  | 'component'
  | 'page'
  | 'feature'
  | 'full-app'
  | 'utility'

export interface TemplateFile {
  path: string
  content: string
  language: string
  isTemplate: boolean
  variables?: TemplateVariable[]
}

export interface TemplateVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'select'
  description: string
  defaultValue?: unknown
  options?: string[] // for select type
  required: boolean
}

export interface TemplateConfiguration {
  variables: TemplateVariable[]
  postInstallScript?: string
  requiredFeatures: string[]
  compatibleFrameworks: Framework[]
}

export interface TemplateReview {
  id: string
  userId: string
  user: Pick<User, 'id' | 'name' | 'avatar'>
  rating: number
  comment: string
  createdAt: Date
}

export interface Deployment {
  id: string
  projectId: string
  provider: DeploymentProvider
  environment: DeploymentEnvironment
  status: DeploymentStatus
  url?: string
  buildLogs: string[]
  errorLogs: string[]
  startedAt: Date
  completedAt?: Date
  deployedBy: string
  commit?: string
  branch?: string
  configuration: DeploymentConfiguration
}

export type DeploymentProvider = 'vercel' | 'netlify' | 'aws' | 'custom'

export type DeploymentEnvironment = 'development' | 'staging' | 'production'

export type DeploymentStatus = 
  | 'pending'
  | 'building'
  | 'deploying'
  | 'success'
  | 'failed'
  | 'cancelled'

export interface DeploymentConfiguration {
  buildCommand?: string
  outputDirectory?: string
  nodeVersion?: string
  environmentVariables: Record<string, string>
  domains?: string[]
  redirects?: DeploymentRedirect[]
  headers?: DeploymentHeader[]
}

export interface DeploymentRedirect {
  source: string
  destination: string
  permanent: boolean
}

export interface DeploymentHeader {
  source: string
  headers: Record<string, string>
}