// Re-export all types for easy importing
export * from './api'
export * from './auth'
export * from './collaboration'
export * from './common'
export * from './editor'
export * from './socket'
export * from './ai'

// Re-export specific types to avoid conflicts
export type {
  Project,
  ProjectFile,
  Template,
  TemplateFile,
  ProjectCollaborator,
  ProjectRole,
  ProjectPermission,
  ProjectSettings
} from './project'

export type {
  Deployment as ProjectDeployment,
  DeploymentProvider as ProjectDeploymentProvider,
  DeploymentEnvironment as ProjectDeploymentEnvironment,
  DeploymentStatus as ProjectDeploymentStatus,
  DeploymentConfiguration as ProjectDeploymentConfiguration,
  EnvironmentVariable as ProjectEnvironmentVariable
} from './project'

export type {
  DeploymentProvider,
  Deployment,
  DeploymentEnvironment,
  DeploymentStatus,
  DeploymentConfiguration,
  EnvironmentVariable,
  DeploymentAnalytics,
  DeploymentAlert
} from './deployment'

export type {
  UserProfile,
  UserStats,
  Achievement,
  SocialLink,
  UserActivity,
  UserNotification,
  UserSession,
  UserInvitation
} from './user'