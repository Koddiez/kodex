import { BaseEntity } from './common'
import { EditorPreferences, NotificationPreferences } from './auth'

export interface UserProfile extends BaseEntity {
  email: string
  name: string
  username?: string
  avatar?: string
  bio?: string
  location?: string
  website?: string
  company?: string
  plan: UserPlan
  planExpiresAt?: Date
  preferences: UserPreferences
  stats: UserStats
  achievements: Achievement[]
  socialLinks: SocialLink[]
  lastActiveAt: Date
  emailVerified: boolean
  twoFactorEnabled: boolean
  isOnline: boolean
}

export type UserPlan = 'free' | 'pro' | 'enterprise'

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system'
  language: string
  timezone: string
  dateFormat: string
  timeFormat: '12h' | '24h'
  notifications: NotificationPreferences
  editor: EditorPreferences
  privacy: PrivacyPreferences
  accessibility: AccessibilityPreferences
}

export interface PrivacyPreferences {
  profileVisibility: 'public' | 'private' | 'friends'
  showEmail: boolean
  showLocation: boolean
  showActivity: boolean
  allowDirectMessages: boolean
  allowCollaborationInvites: boolean
}

export interface AccessibilityPreferences {
  highContrast: boolean
  reducedMotion: boolean
  screenReader: boolean
  keyboardNavigation: boolean
  fontSize: 'small' | 'medium' | 'large' | 'extra-large'
}

export interface UserStats {
  projectsCreated: number
  templatesCreated: number
  collaborationsJoined: number
  linesOfCode: number
  deploymentsCount: number
  totalBuildTime: number
  streakDays: number
  lastActiveStreak: Date
}

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: AchievementCategory
  unlockedAt: Date
  progress?: {
    current: number
    target: number
  }
}

export type AchievementCategory = 
  | 'projects'
  | 'collaboration'
  | 'code_quality'
  | 'deployment'
  | 'community'
  | 'learning'

export interface SocialLink {
  platform: SocialPlatform
  url: string
  username: string
}

export type SocialPlatform = 
  | 'github'
  | 'gitlab'
  | 'twitter'
  | 'linkedin'
  | 'dribbble'
  | 'behance'
  | 'portfolio'

export interface UserActivity {
  id: string
  userId: string
  type: ActivityType
  description: string
  metadata: Record<string, unknown>
  createdAt: Date
  isPublic: boolean
}

export type ActivityType =
  | 'project_created'
  | 'project_deployed'
  | 'template_published'
  | 'collaboration_joined'
  | 'achievement_unlocked'
  | 'profile_updated'

export interface UserNotification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, unknown>
  read: boolean
  createdAt: Date
  expiresAt?: Date
}

export type NotificationType =
  | 'collaboration_invite'
  | 'project_shared'
  | 'deployment_success'
  | 'deployment_failed'
  | 'comment_mention'
  | 'system_update'
  | 'plan_expiring'
  | 'achievement_unlocked'

export interface UserSession {
  id: string
  userId: string
  deviceInfo: DeviceInfo
  ipAddress: string
  userAgent: string
  createdAt: Date
  lastActiveAt: Date
  expiresAt: Date
  isActive: boolean
}

export interface DeviceInfo {
  type: 'desktop' | 'mobile' | 'tablet'
  os: string
  browser: string
  location?: {
    country: string
    city: string
  }
}

export interface UserInvitation {
  id: string
  email: string
  invitedBy: string
  inviterInfo: Pick<UserProfile, 'id' | 'name' | 'avatar'>
  projectId?: string
  role?: string
  message?: string
  status: InvitationStatus
  createdAt: Date
  expiresAt: Date
  acceptedAt?: Date
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'