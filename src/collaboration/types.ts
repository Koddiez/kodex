/**
 * Types for real-time collaboration features
 */

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  color: string;
  status?: 'online' | 'away' | 'offline';
  lastSeen?: Date;
  cursor?: CursorPosition;
  selection?: SelectionRange;
}

export interface CursorPosition {
  lineNumber: number;
  column: number;
}

export interface SelectionRange {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
}

export interface PresenceState {
  users: Record<string, User>;
  activeUsers: string[];
  documentId: string;
  version: number;
}

export interface DocumentChange {
  type: 'insert' | 'delete' | 'replace';
  position: number;
  text?: string;
  length?: number;
  userId: string;
  timestamp: number;
  version: number;
}

export interface DocumentState {
  content: string;
  changes: DocumentChange[];
  version: number;
  lastModified: Date;
  lastModifiedBy: string;
}

export interface Session {
  id: string;
  documentId: string;
  ownerId: string;
  participants: string[];
  createdAt: Date;
  endedAt?: Date;
  isActive: boolean;
  permissions: {
    canEdit: boolean;
    canInvite: boolean;
    canKick: boolean;
    canEnd: boolean;
  };
}

export interface CollaborationMessage {
  type: 'chat' | 'system' | 'command' | 'presence' | 'cursor' | 'selection' | 'edit';
  from: string;
  timestamp: number;
  payload: any;
}

export interface ChatMessage extends CollaborationMessage {
  type: 'chat';
  payload: {
    content: string;
    replyTo?: string;
    mentions?: string[];
  };
}

export interface CursorUpdateMessage extends CollaborationMessage {
  type: 'cursor';
  payload: {
    position: CursorPosition;
    filePath: string;
  };
}

export interface SelectionUpdateMessage extends CollaborationMessage {
  type: 'selection';
  payload: {
    selection: SelectionRange;
    filePath: string;
  };
}

export interface EditMessage extends CollaborationMessage {
  type: 'edit';
  payload: {
    changes: DocumentChange[];
    filePath: string;
  };
}

export interface PresenceUpdateMessage extends CollaborationMessage {
  type: 'presence';
  payload: {
    user: Partial<User>;
  };
}

export type AnyMessage = 
  | ChatMessage 
  | CursorUpdateMessage 
  | SelectionUpdateMessage 
  | EditMessage 
  | PresenceUpdateMessage
  | CollaborationMessage;

export interface CollaborationOptions {
  /**
   * Whether to enable real-time collaboration features
   */
  enabled: boolean;
  
  /**
   * URL of the collaboration server
   */
  serverUrl?: string;
  
  /**
   * Authentication token
   */
  token?: string;
  
  /**
   * User information
   */
  user: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  };
  
  /**
   * Document information
   */
  document: {
    id: string;
    title?: string;
    language?: string;
  };
  
  /**
   * Callbacks for various events
   */
  callbacks?: {
    onConnect?: () => void;
    onDisconnect?: (reason: string) => void;
    onError?: (error: Error) => void;
    onMessage?: (message: AnyMessage) => void;
    onPresenceUpdate?: (presence: PresenceState) => void;
    onDocumentUpdate?: (state: DocumentState) => void;
    onUserJoined?: (user: User) => void;
    onUserLeft?: (userId: string) => void;
  };
  
  /**
   * Configuration options
   */
  config?: {
    /**
     * Whether to show presence indicators (cursors, avatars, etc.)
     */
    showPresence?: boolean;
    
    /**
     * Whether to show chat panel
     */
    showChat?: boolean;
    
    /**
     * Whether to show comments
     */
    showComments?: boolean;
    
    /**
     * Whether to show version history
     */
    showHistory?: boolean;
    
    /**
     * Whether to show user list
     */
    showUserList?: boolean;
  };
}
