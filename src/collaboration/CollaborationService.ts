import { EventEmitter } from 'events';
import { AnyMessage, CollaborationOptions, DocumentState, PresenceState, User } from './types';

/**
 * Service for managing real-time collaboration features
 */
export class CollaborationService extends EventEmitter {
  private ws: WebSocket | null = null;
  private options: Required<CollaborationOptions>;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private pendingMessages: AnyMessage[] = [];
  private isConnected = false;
  private documentState: DocumentState;
  private presenceState: PresenceState;
  private userId: string;

  constructor(options: CollaborationOptions) {
    super();
    this.userId = options.user.id;
    
    // Set default options
    this.options = {
      enabled: true,
      serverUrl: 'wss://collab.kodex.ai',
      token: '',
      user: options.user,
      document: {
        id: options.document.id,
        title: options.document.title || 'Untitled Document',
        language: options.document.language || 'typescript',
      },
      callbacks: {
        onConnect: () => {},
        onDisconnect: () => {},
        onError: () => {},
        onMessage: () => {},
        onPresenceUpdate: () => {},
        onDocumentUpdate: () => {},
        onUserJoined: () => {},
        onUserLeft: () => {},
        ...options.callbacks,
      },
      config: {
        showPresence: true,
        showChat: true,
        showComments: true,
        showHistory: true,
        showUserList: true,
        ...options.config,
      },
    };

    // Initialize document state
    this.documentState = {
      content: '',
      changes: [],
      version: 0,
      lastModified: new Date(),
      lastModifiedBy: this.userId,
    };

    // Initialize presence state
    this.presenceState = {
      users: {},
      activeUsers: [],
      documentId: this.options.document.id,
      version: 0,
    };

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Connect to the collaboration server
   */
  connect(): void {
    if (!this.options.enabled) {
      console.warn('Collaboration features are disabled');
      return;
    }

    try {
      this.ws = new WebSocket(this.options.serverUrl);
      this.setupWebSocketListeners();
    } catch (error) {
      console.error('Failed to connect to collaboration server:', error);
      this.handleError(error as Error);
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the collaboration server
   */
  disconnect(): void {
    this.cleanup();
    this.emit('disconnected', { reason: 'user_disconnected' });
  }

  /**
   * Send a message to the collaboration server
   */
  sendMessage(message: AnyMessage): void {
    if (!this.isConnected || !this.ws) {
      this.pendingMessages.push(message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Failed to send message:', error);
      this.handleError(error as Error);
    }
  }

  /**
   * Update the user's cursor position
   */
  updateCursor(position: { lineNumber: number; column: number }, filePath: string): void {
    this.sendMessage({
      type: 'cursor',
      from: this.userId,
      timestamp: Date.now(),
      payload: {
        position,
        filePath,
      },
    });
  }

  /**
   * Update the user's selection
   */
  updateSelection(selection: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  }, filePath: string): void {
    this.sendMessage({
      type: 'selection',
      from: this.userId,
      timestamp: Date.now(),
      payload: {
        selection,
        filePath,
      },
    });
  }

  /**
   * Send a chat message
   */
  sendChatMessage(content: string, replyTo?: string, mentions: string[] = []): void {
    this.sendMessage({
      type: 'chat',
      from: this.userId,
      timestamp: Date.now(),
      payload: {
        content,
        replyTo,
        mentions,
      },
    });
  }

  /**
   * Apply changes to the document
   */
  applyChanges(changes: Array<{
    range: { start: number; end: number };
    text: string;
  }>, filePath: string): void {
    const documentChanges = changes.map(change => ({
      type: change.text ? 'insert' : 'delete',
      position: change.range.start,
      text: change.text,
      length: change.range.end - change.range.start,
      userId: this.userId,
      timestamp: Date.now(),
      version: this.documentState.version + 1,
    }));

    this.sendMessage({
      type: 'edit',
      from: this.userId,
      timestamp: Date.now(),
      payload: {
        changes: documentChanges,
        filePath,
      },
    });
  }

  /**
   * Update user presence
   */
  updatePresence(update: Partial<User>): void {
    this.sendMessage({
      type: 'presence',
      from: this.userId,
      timestamp: Date.now(),
      payload: {
        user: {
          ...this.options.user,
          ...update,
          id: this.userId,
        },
      },
    });
  }

  private setupEventListeners(): void {
    // Forward events to user callbacks
    this.on('connected', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.options.callbacks.onConnect?.();
      this.flushPendingMessages();
      this.startHeartbeat();
    });

    this.on('disconnected', (data: { reason: string }) => {
      this.isConnected = false;
      this.options.callbacks.onDisconnect?.(data.reason);
      if (data.reason !== 'user_disconnected') {
        this.scheduleReconnect();
      }
    });

    this.on('message', (message: AnyMessage) => {
      this.options.callbacks.onMessage?.(message);
      this.handleIncomingMessage(message);
    });

    this.on('error', (error: Error) => {
      this.options.callbacks.onError?.(error);
    });
  }

  private setupWebSocketListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('Connected to collaboration server');
      this.emit('connected');
      
      // Send initial presence update
      this.updatePresence({
        status: 'online',
        lastSeen: new Date(),
      });
    };

    this.ws.onclose = (event) => {
      console.log('Disconnected from collaboration server:', event.reason);
      this.cleanup();
      this.emit('disconnected', { reason: event.reason || 'connection_closed' });
    };

    this.ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      this.handleError(new Error('WebSocket error'));
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as AnyMessage;
        this.emit('message', message);
      } catch (error) {
        console.error('Failed to parse message:', error);
        this.handleError(error as Error);
      }
    };
  }

  private handleIncomingMessage(message: AnyMessage): void {
    switch (message.type) {
      case 'presence':
        if (message.payload?.user) {
          this.handlePresenceUpdate(message.payload.user.id, message.payload.user);
        }
        break;
      case 'cursor':
      case 'selection':
      case 'chat':
      case 'edit':
        // Forward message to specific handlers
        this.emit(message.type, message);
        break;
      case 'system':
        this.handleSystemMessage(message);
        break;
      default:
        console.warn('Unknown message type:', message.type);
    }
  }

  private handlePresenceUpdate(userId: string, presence: Partial<Omit<User, 'id'>>): void {
    const user = this.presenceState.users[userId];
    const isNewUser = !user;

    // Generate a random color if not provided
    const userColor = user?.color || `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0').slice(0, 6)}`;
    
    // Create base user data with required fields
    const baseUserData = {
      id: userId,
      name: user?.name || 'Anonymous',
      color: userColor,
      status: 'online' as const,
      lastSeen: new Date()
    };
    
    // Create the updated user object with all fields
    const updatedUser: User = {
      ...baseUserData,
      // Only include optional fields if they exist
      ...(user?.email && { email: user.email }),
      ...(user?.avatar && { avatar: user.avatar }),
      ...(user?.cursor && { cursor: user.cursor }),
      ...(user?.selection && { selection: user.selection }),
      // Apply presence updates, which may override any of the above
      ...presence
    };

    this.presenceState.users[userId] = updatedUser;

    // Update active users list
    if (presence.status === 'online' && !this.presenceState.activeUsers.includes(userId)) {
      this.presenceState.activeUsers.push(userId);
    } else if (presence.status !== 'online' && this.presenceState.activeUsers.includes(userId)) {
      this.presenceState.activeUsers = this.presenceState.activeUsers.filter(id => id !== userId);
    }

    // Emit events
    this.options.callbacks.onPresenceUpdate?.(this.presenceState);
    
    if (isNewUser && userId !== this.userId) {
      this.options.callbacks.onUserJoined?.(updatedUser);
    }
  }

  private handleSystemMessage(message: AnyMessage): void {
    if (message.type !== 'system') return;

    switch (message.payload.type) {
      case 'user_joined':
        console.log(`User joined: ${message.payload.userId}`);
        break;
      case 'user_left':
        console.log(`User left: ${message.payload.userId}`);
        const userId = message.payload.userId;
        if (this.presenceState.users[userId]) {
          this.presenceState.users[userId].status = 'offline';
          this.presenceState.activeUsers = this.presenceState.activeUsers.filter(id => id !== userId);
          this.options.callbacks.onPresenceUpdate?.(this.presenceState);
          this.options.callbacks.onUserLeft?.(userId);
        }
        break;
      case 'document_updated':
        console.log('Document updated by:', message.payload.userId);
        break;
      default:
        console.log('System message:', message.payload);
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private flushPendingMessages(): void {
    while (this.pendingMessages.length > 0) {
      const message = this.pendingMessages.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  private handleError(error: Error): void {
    console.error('Collaboration error:', error);
    this.emit('error', error);
  }

  private cleanup(): void {
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  // Public getters
  get isCollaborationEnabled(): boolean {
    return this.options.enabled && this.isConnected;
  }

  get activeUsers(): User[] {
    return this.presenceState.activeUsers
      .map(id => this.presenceState.users[id])
      .filter((user): user is User => !!user);
  }

  get documentVersion(): number {
    return this.documentState.version;
  }
}
