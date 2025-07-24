import { WebSocket, Server as WSServer } from 'ws';
import { IncomingMessage } from 'http';
import { AuthService } from './auth';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { v4 as uuidv4 } from 'uuid';
import { URL } from 'url';

/**
 * WebSocket connection with additional metadata
 */
export interface WebSocketWithMetadata extends WebSocket {
  id: string;
  ip: string;
  userId?: string;
  sessionId?: string;
  isAlive: boolean;
  lastActivity: number;
  joinTime: number;
  userAgent?: string;
  roles?: string[];
  roomIds: Set<string>;
}

/**
 * WebSocket server options
 */
export interface WSSecurityOptions {
  /**
   * Authentication service instance
   */
  authService: AuthService;
  
  /**
   * Maximum message size in bytes (default: 1MB)
   */
  maxMessageSize?: number;
  
  /**
   * Ping interval in milliseconds (default: 30 seconds)
   */
  pingInterval?: number;
  
  /**
   * Maximum number of connections per IP (default: 10)
   */
  maxConnectionsPerIp?: number;
  
  /**
   * Maximum number of messages per second per connection (default: 50)
   */
  maxMessagesPerSecond?: number;
  
  /**
   * Whether to require authentication (default: true)
   */
  requireAuth?: boolean;
  
  /**
   * Allowed origins (default: ['*'])
   */
  allowedOrigins?: string[];
  
  /**
   * Enable debug logging (default: false)
   */
  debug?: boolean;
}

/**
 * Default WebSocket server options
 */
const defaultWSSecurityOptions: Required<Omit<WSSecurityOptions, 'authService'>> = {
  maxMessageSize: 1024 * 1024, // 1MB
  pingInterval: 30 * 1000, // 30 seconds
  maxConnectionsPerIp: 10,
  maxMessagesPerSecond: 50,
  requireAuth: true,
  allowedOrigins: ['*'],
  debug: false,
};

/**
 * WebSocket security middleware for handling authentication, rate limiting, and connection management
 */
export class WSSecurity {
  private options: Required<WSSecurityOptions>;
  private wss: WSServer;
  private connections: Map<string, WebSocketWithMetadata> = new Map();
  private ipConnections: Map<string, Set<string>> = new Map();
  private rateLimiters: Map<string, RateLimiterMemory> = new Map();
  private pingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  constructor(server: WSServer, options: WSSecurityOptions) {
    this.wss = server;
    this.options = {
      ...defaultWSSecurityOptions,
      ...options,
    };
    
    this.setupEventHandlers();
    this.setupCleanupInterval();
    this.setupPingInterval();
  }
  
  /**
   * Setup WebSocket server event handlers
   */
  private setupEventHandlers() {
    this.wss.on('connection', this.handleConnection.bind(this));
    this.wss.on('close', this.handleClose.bind(this));
    
    // Handle server errors
    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });
  }
  
  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: WebSocketWithMetadata, req: IncomingMessage) {
    const ip = this.getClientIp(req);
    const userAgent = req.headers['user-agent'] || 'unknown';
    const connectionId = uuidv4();
    
    // Set initial metadata
    ws.id = connectionId;
    ws.ip = ip;
    ws.isAlive = true;
    ws.lastActivity = Date.now();
    ws.joinTime = Date.now();
    ws.userAgent = userAgent;
    ws.roomIds = new Set();
    
    // Track connection
    this.connections.set(connectionId, ws);
    this.trackIpConnection(ip, connectionId);
    
    // Check origin
    if (!this.isOriginAllowed(req)) {
      this.log(`Connection ${connectionId} from disallowed origin: ${req.headers.origin}`);
      return this.closeConnection(ws, 4001, 'Origin not allowed');
    }
    
    // Check connection limit per IP
    if (this.isConnectionLimitReached(ip)) {
      this.log(`Connection limit reached for IP: ${ip}`);
      return this.closeConnection(ws, 4002, 'Connection limit reached');
    }
    
    // Setup rate limiter for this connection
    this.setupRateLimiter(connectionId);
    
    // Setup message handler
    ws.on('message', (data: string) => this.handleMessage(ws, data));
    
    // Setup close handler
    ws.on('close', () => this.handleClientClose(ws));
    
    // Setup error handler
    ws.on('error', (error) => this.handleError(ws, error));
    
    // Setup pong handler for keep-alive
    ws.on('pong', () => {
      ws.isAlive = true;
      ws.lastActivity = Date.now();
    });
    
    // If authentication is required, wait for auth message
    if (this.options.requireAuth) {
      // Set a timeout for authentication
      const authTimeout = setTimeout(() => {
        if (!ws.userId) {
          this.log(`Connection ${connectionId} failed to authenticate in time`);
          this.closeConnection(ws, 4003, 'Authentication timeout');
        }
      }, 10000); // 10 seconds to authenticate
      
      // Override message handler to wait for auth
      const originalMessageHandler = ws.onmessage;
      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data.toString());
          
          if (data.type === 'auth' && data.token) {
            clearTimeout(authTimeout);
            await this.handleAuth(ws, data.token);
            
            // Restore original message handler
            ws.onmessage = originalMessageHandler;
            
            // If there was a message in the auth request, process it
            if (data.message) {
              await this.handleMessage(ws, JSON.stringify(data.message));
            }
          } else {
            throw new Error('Authentication required');
          }
        } catch (error) {
          this.log(`Authentication error: ${error.message}`);
          this.closeConnection(ws, 4003, 'Authentication failed');
        }
      };
      
      // Send auth required message
      this.send(ws, {
        type: 'auth_required',
        message: 'Authentication required',
      });
    } else {
      // No auth required, send ready message
      this.send(ws, {
        type: 'ready',
        connectionId,
        timestamp: Date.now(),
      });
    }
    
    this.log(`New connection: ${connectionId} from ${ip} (${userAgent})`);
  }
  
  /**
   * Handle authentication
   */
  private async handleAuth(ws: WebSocketWithMetadata, token: string) {
    try {
      const result = await this.options.authService.validateToken(token);
      
      if (!result) {
        throw new Error('Invalid or expired token');
      }
      
      // Update connection with user info
      ws.userId = result.user.id;
      ws.sessionId = result.session.id;
      ws.roles = [result.user.role];
      
      // Send auth success message
      this.send(ws, {
        type: 'auth_success',
        userId: result.user.id,
        sessionId: result.session.id,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
        },
      });
      
      this.log(`Authenticated connection ${ws.id} as user ${result.user.id}`);
      
      return true;
    } catch (error) {
      this.log(`Authentication failed for connection ${ws.id}: ${error.message}`);
      this.closeConnection(ws, 4003, 'Authentication failed');
      return false;
    }
  }
  
  /**
   * Handle incoming WebSocket messages
   */
  private async handleMessage(ws: WebSocketWithMetadata, data: string) {
    try {
      // Check if connection is authenticated if required
      if (this.options.requireAuth && !ws.userId) {
        throw new Error('Authentication required');
      }
      
      // Check message size
      if (data.length > this.options.maxMessageSize) {
        throw new Error(`Message too large (max ${this.options.maxMessageSize} bytes)`);
      }
      
      // Check rate limiting
      if (!this.checkRateLimit(ws.id)) {
        throw new Error('Rate limit exceeded');
      }
      
      // Update last activity
      ws.lastActivity = Date.now();
      
      // Parse message
      const message = JSON.parse(data);
      
      // Handle different message types
      switch (message.type) {
        case 'ping':
          this.send(ws, { type: 'pong', timestamp: Date.now() });
          break;
          
        case 'join':
          this.handleJoinRoom(ws, message.roomId);
          break;
          
        case 'leave':
          this.handleLeaveRoom(ws, message.roomId);
          break;
          
        case 'broadcast':
          this.handleBroadcast(ws, message.roomId, message.data);
          break;
          
        default:
          // Forward custom message types to the application
          this.emit('message', {
            ws,
            message,
            broadcast: (data: any) => this.broadcastToRoom(ws.roomIds.values().next().value, data, ws.id),
            reply: (data: any) => this.send(ws, data),
          });
      }
    } catch (error) {
      this.log(`Message handling error: ${error.message}`);
      this.sendError(ws, error.message);
    }
  }
  
  /**
   * Handle joining a room
   */
  private handleJoinRoom(ws: WebSocketWithMetadata, roomId: string) {
    if (!roomId) {
      throw new Error('Room ID is required');
    }
    
    ws.roomIds.add(roomId);
    this.send(ws, { type: 'room_joined', roomId });
    this.log(`Connection ${ws.id} joined room ${roomId}`);
  }
  
  /**
   * Handle leaving a room
   */
  private handleLeaveRoom(ws: WebSocketWithMetadata, roomId: string) {
    if (!roomId) {
      // Leave all rooms
      ws.roomIds.clear();
      this.send(ws, { type: 'left_all_rooms' });
      this.log(`Connection ${ws.id} left all rooms`);
    } else {
      ws.roomIds.delete(roomId);
      this.send(ws, { type: 'left_room', roomId });
      this.log(`Connection ${ws.id} left room ${roomId}`);
    }
  }
  
  /**
   * Handle broadcasting to a room
   */
  private handleBroadcast(sender: WebSocketWithMetadata, roomId: string, data: any) {
    if (!roomId) {
      throw new Error('Room ID is required for broadcast');
    }
    
    // Verify sender is in the room
    if (!sender.roomIds.has(roomId)) {
      throw new Error('Not a member of the specified room');
    }
    
    this.broadcastToRoom(roomId, data, sender.id);
  }
  
  /**
   * Broadcast a message to all connections in a room
   */
  public broadcastToRoom(roomId: string, data: any, excludeConnectionId?: string) {
    let count = 0;
    
    this.connections.forEach((ws) => {
      if (ws.roomIds.has(roomId) && ws.readyState === WebSocket.OPEN && ws.id !== excludeConnectionId) {
        this.send(ws, data);
        count++;
      }
    });
    
    return count;
  }
  
  /**
   * Send a message to a WebSocket connection
   */
  public send(ws: WebSocket, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }
  
  /**
   * Send an error message to a WebSocket connection
   */
  private sendError(ws: WebSocket, message: string, code?: number) {
    return this.send(ws, {
      type: 'error',
      code,
      message,
      timestamp: Date.now(),
    });
  }
  
  /**
   * Close a WebSocket connection
   */
  private closeConnection(ws: WebSocketWithMetadata, code?: number, reason?: string) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(code, reason);
      }
    } catch (error) {
      this.log(`Error closing connection: ${error.message}`);
    } finally {
      this.cleanupConnection(ws);
    }
  }
  
  /**
   * Handle WebSocket close event
   */
  private handleClientClose(ws: WebSocketWithMetadata) {
    this.log(`Connection closed: ${ws.id}`);
    this.cleanupConnection(ws);
  }
  
  /**
   * Clean up WebSocket server resources
   */
  private handleClose() {
    this.log('WebSocket server is closing');
    this.cleanup();
  }
  
  /**
   * Handle WebSocket errors
   */
  private handleError(ws: WebSocketWithMetadata, error: Error) {
    this.log(`WebSocket error: ${error.message}`);
    this.cleanupConnection(ws);
  }
  
  /**
   * Clean up connection resources
   */
  private cleanupConnection(ws: WebSocketWithMetadata) {
    // Remove from rooms
    ws.roomIds.forEach((roomId) => {
      // Notify room members that this user left
      this.broadcastToRoom(roomId, {
        type: 'user_left',
        userId: ws.userId,
        connectionId: ws.id,
        timestamp: Date.now(),
      });
    });
    
    // Remove from connection tracking
    this.connections.delete(ws.id);
    
    // Remove from IP tracking
    if (this.ipConnections.has(ws.ip)) {
      const ipConnections = this.ipConnections.get(ws.ip);
      if (ipConnections) {
        ipConnections.delete(ws.id);
        if (ipConnections.size === 0) {
          this.ipConnections.delete(ws.ip);
        }
      }
    }
    
    // Clean up rate limiter
    this.rateLimiters.delete(ws.id);
    
    // Emit disconnect event
    this.emit('disconnect', {
      connectionId: ws.id,
      userId: ws.userId,
      sessionId: ws.sessionId,
      ip: ws.ip,
      duration: Date.now() - ws.joinTime,
    });
    
    this.log(`Cleaned up connection: ${ws.id}`);
  }
  
  /**
   * Track IP connections for rate limiting
   */
  private trackIpConnection(ip: string, connectionId: string) {
    if (!this.ipConnections.has(ip)) {
      this.ipConnections.set(ip, new Set());
    }
    this.ipConnections.get(ip)?.add(connectionId);
  }
  
  /**
   * Check if connection limit is reached for an IP
   */
  private isConnectionLimitReached(ip: string): boolean {
    const connections = this.ipConnections.get(ip) || new Set();
    return connections.size >= this.options.maxConnectionsPerIp;
  }
  
  /**
   * Setup rate limiter for a connection
   */
  private setupRateLimiter(connectionId: string) {
    const rateLimiter = new RateLimiterMemory({
      points: this.options.maxMessagesPerSecond,
      duration: 1, // Per second
    });
    
    this.rateLimiters.set(connectionId, rateLimiter);
  }
  
  /**
   * Check if a connection has exceeded rate limits
   */
  private checkRateLimit(connectionId: string): boolean {
    const rateLimiter = this.rateLimiters.get(connectionId);
    if (!rateLimiter) return true;
    
    try {
      rateLimiter.consume(1);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get client IP from request
   */
  private getClientIp(req: IncomingMessage): string {
    // Try to get the real IP behind proxies
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded || req.socket.remoteAddress || '')
      .split(',')[0]
      .trim();
    
    return ip || 'unknown';
  }
  
  /**
   * Check if the origin is allowed
   */
  private isOriginAllowed(req: IncomingMessage): boolean {
    const origin = req.headers.origin;
    
    // Allow all origins if not specified
    if (this.options.allowedOrigins.includes('*')) {
      return true;
    }
    
    // Check if the origin is in the allowed list
    return !origin || this.options.allowedOrigins.includes(origin);
  }
  
  /**
   * Setup ping interval to check for dead connections
   */
  private setupPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    this.pingInterval = setInterval(() => {
      this.connections.forEach((ws) => {
        if (ws.isAlive === false) {
          this.log(`Terminating dead connection: ${ws.id}`);
          return this.closeConnection(ws, 4000, 'Connection timeout');
        }
        
        ws.isAlive = false;
        ws.ping(() => {});
      });
    }, this.options.pingInterval);
  }
  
  /**
   * Setup cleanup interval to remove dead connections
   */
  private setupCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Clean up dead connections every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      const maxInactiveTime = this.options.pingInterval * 3; // 3x ping interval
      
      this.connections.forEach((ws) => {
        if (now - ws.lastActivity > maxInactiveTime) {
          this.log(`Cleaning up inactive connection: ${ws.id}`);
          this.closeConnection(ws, 4000, 'Inactive connection');
        }
      });
    }, 60000); // Every minute
  }
  
  /**
   * Log a message if debug is enabled
   */
  private log(message: string) {
    if (this.options.debug) {
      console.log(`[WSSecurity] ${message}`);
    }
  }
  
  /**
   * Emit an event
   */
  private emit(event: string, data: any) {
    this.wss.emit(event, data);
  }
  
  /**
   * Get all active connections
   */
  public getConnections(): WebSocketWithMetadata[] {
    return Array.from(this.connections.values());
  }
  
  /**
   * Get connections for a specific user
   */
  public getUserConnections(userId: string): WebSocketWithMetadata[] {
    return this.getConnections().filter(
      (ws) => ws.userId === userId && ws.readyState === WebSocket.OPEN
    );
  }
  
  /**
   * Get connections in a specific room
   */
  public getRoomConnections(roomId: string): WebSocketWithMetadata[] {
    return this.getConnections().filter(
      (ws) => ws.roomIds.has(roomId) && ws.readyState === WebSocket.OPEN
    );
  }
  
  /**
   * Send a message to a specific user
   */
  public sendToUser(userId: string, data: any): number {
    let count = 0;
    
    this.getUserConnections(userId).forEach((ws) => {
      if (this.send(ws, data)) {
        count++;
      }
    });
    
    return count;
  }
  
  /**
   * Broadcast a message to all connections
   */
  public broadcast(data: any, excludeConnectionId?: string): number {
    let count = 0;
    
    this.connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN && ws.id !== excludeConnectionId) {
        if (this.send(ws, data)) {
          count++;
        }
      }
    });
    
    return count;
  }
  
  /**
   * Close all connections and clean up
   */
  public closeAllConnections(code?: number, reason?: string) {
    this.connections.forEach((ws) => {
      this.closeConnection(ws, code, reason);
    });
  }
  
  /**
   * Clean up resources
   */
  public cleanup() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.closeAllConnections(1001, 'Server shutting down');
    this.connections.clear();
    this.ipConnections.clear();
    this.rateLimiters.clear();
  }
}

/**
 * Create a new WebSocket security instance
 */
export function createWSSecurity(server: WSServer, options: WSSecurityOptions) {
  return new WSSecurity(server, options);
}

// Extend the WebSocket.Server interface to include our custom events
declare module 'ws' {
  interface Server {
    on(event: 'message', listener: (data: { 
      ws: WebSocketWithMetadata; 
      message: any;
      broadcast: (data: any) => void;
      reply: (data: any) => void;
    }) => void): this;
    
    on(event: 'disconnect', listener: (data: {
      connectionId: string;
      userId?: string;
      sessionId?: string;
      ip: string;
      duration: number;
    }) => void): this;
    
    emit(event: 'message', data: any): boolean;
    emit(event: 'disconnect', data: any): boolean;
  }
}
