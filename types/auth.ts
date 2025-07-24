import { BaseEntity } from './common'

export interface User extends BaseEntity {
  email: string
  name: string
  avatar?: string
  plan: UserPlan
  preferences: UserPreferences
  lastActiveAt: Date
  emailVerified: boolean
  twoFactorEnabled: boolean
}

export type UserPlan = 'free' | 'pro' | 'enterprise'

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  notifications: NotificationPreferences
  editor: EditorPreferences
}

export interface NotificationPreferences {
  email: boolean
  push: boolean
  collaboration: boolean
  deployment: boolean
  marketing: boolean
}

export interface EditorPreferences {
  fontSize: number
  fontFamily: string
  tabSize: number
  wordWrap: boolean
  minimap: boolean
  lineNumbers: boolean
  autoSave: boolean
  formatOnSave: boolean
}

export interface AuthSession {
  user: User
  accessToken: string
  refreshToken: string
  expiresAt: Date
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterCredentials {
  email: string
  password: string
  name: string
  acceptTerms: boolean
}

export interface ResetPasswordRequest {
  email: string
}

export interface ResetPasswordConfirm {
  token: string
  password: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface TwoFactorSetup {
  secret: string
  qrCode: string
  backupCodes: string[]
}

export interface TwoFactorVerification {
  token: string
  backupCode?: string
}

// OAuth provider types
export type OAuthProvider = 'google' | 'github' | 'discord'

export interface OAuthProfile {
  id: string
  email: string
  name: string
  avatar?: string
  provider: OAuthProvider
}

// JWT token payload
export interface JWTPayload {
  sub: string // user id
  email: string
  name: string
  plan: UserPlan
  iat: number
  exp: number
}