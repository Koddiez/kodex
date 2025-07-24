import { EditorPosition, EditorRange } from './editor'
import { User } from './auth'

export interface CollaborationSession {
  id: string
  projectId: string
  participants: Participant[]
  operations: Operation[]
  cursors: Map<string, Cursor>
  comments: Comment[]
  createdAt: Date
  lastActivity: Date
}

export interface Participant {
  userId: string
  user: Pick<User, 'id' | 'name' | 'email' | 'avatar'>
  joinedAt: Date
  lastSeen: Date
  isActive: boolean
  permissions: CollaborationPermission[]
  cursor?: Cursor
  selection?: Selection
}

export type CollaborationPermission = 
  | 'read'
  | 'write'
  | 'comment'
  | 'suggest'

export interface Cursor {
  userId: string
  fileId: string
  position: EditorPosition
  color: string
  isVisible: boolean
  lastUpdated: Date
}

export interface Selection {
  userId: string
  fileId: string
  range: EditorRange
  color: string
  isVisible: boolean
  lastUpdated: Date
}

export interface Operation {
  id: string
  type: OperationType
  fileId: string
  position: number
  content?: string
  length?: number
  author: string
  timestamp: Date
  applied: boolean
  transformed?: boolean
}

export type OperationType = 'insert' | 'delete' | 'retain'

export interface Comment {
  id: string
  fileId: string
  range: EditorRange
  content: string
  author: string
  authorInfo: Pick<User, 'id' | 'name' | 'avatar'>
  createdAt: Date
  updatedAt?: Date
  resolved: boolean
  resolvedBy?: string
  resolvedAt?: Date
  replies: CommentReply[]
  reactions: CommentReaction[]
}

export interface CommentReply {
  id: string
  content: string
  author: string
  authorInfo: Pick<User, 'id' | 'name' | 'avatar'>
  createdAt: Date
  updatedAt?: Date
  reactions: CommentReaction[]
}

export interface CommentReaction {
  emoji: string
  users: string[]
  count: number
}

export interface PresenceInfo {
  userId: string
  user: Pick<User, 'id' | 'name' | 'avatar'>
  status: PresenceStatus
  lastSeen: Date
  currentFile?: string
  isTyping: boolean
  typingIn?: string
}

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

export interface TypingIndicator {
  userId: string
  fileId: string
  position: EditorPosition
  startedAt: Date
}

export interface CollaborationEvent {
  type: CollaborationEventType
  data: unknown
  userId: string
  timestamp: Date
  projectId: string
}

export type CollaborationEventType =
  | 'user_joined'
  | 'user_left'
  | 'cursor_moved'
  | 'selection_changed'
  | 'text_changed'
  | 'comment_added'
  | 'comment_resolved'
  | 'file_opened'
  | 'file_closed'
  | 'typing_started'
  | 'typing_stopped'

// Operational Transformation types
export interface OTOperation {
  type: 'retain' | 'insert' | 'delete'
  count?: number
  text?: string
}

export interface OTDocument {
  content: string
  version: number
  operations: OTOperation[]
}

export interface OTTransform {
  operation1: OTOperation[]
  operation2: OTOperation[]
  priority: 'left' | 'right'
}

// Real-time synchronization
export interface SyncState {
  version: number
  pendingOperations: Operation[]
  acknowledgedOperations: Operation[]
  lastSyncAt: Date
}

export interface ConflictResolution {
  conflictId: string
  fileId: string
  operations: Operation[]
  resolution: 'accept_local' | 'accept_remote' | 'merge' | 'manual'
  resolvedBy: string
  resolvedAt: Date
}