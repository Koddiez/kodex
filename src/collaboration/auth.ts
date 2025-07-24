import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

/**
 * Represents a user session
 */
export interface UserSession {
  /**
   * Unique session ID
   */
  id: string;
  
  /**
   * User ID associated with this session
   */
  userId: string;
  
  /**
   * When the session was created
   */
  createdAt: Date;
  
  /**
   * When the session expires
   */
  expiresAt: Date;
  
  /**
   * Session metadata (IP, user agent, etc.)
   */
  metadata: Record<string, any>;
  
  /**
   * Whether the session is active
   */
  isActive: boolean;
}

/**
 * Represents a user in the system
 */
export interface User {
  /**
   * Unique user ID
   */
  id: string;
  
  /**
   * User's display name
   */
  name: string;
  
  /**
   * User's email address
   */
  email: string;
  
  /**
   * URL to the user's avatar
   */
  avatar?: string;
  
  /**
   * User's role
   */
  role: 'guest' | 'user' | 'admin';
  
  /**
   * When the user was created
   */
  createdAt: Date;
  
  /**
   * When the user was last active
   */
  lastActiveAt: Date;
  
  /**
   * Whether the user is active
   */
  isActive: boolean;
}

/**
 * Authentication options
 */
export interface AuthOptions {
  /**
   * Secret key for signing tokens
   */
  secretKey: string;
  
  /**
   * Token expiration time in seconds (default: 24 hours)
   */
  tokenExpiration?: number;
  
  /**
   * Session expiration time in seconds (default: 7 days)
   */
  sessionExpiration?: number;
  
  /**
   * Whether to require email verification
   */
  requireEmailVerification?: boolean;
  
  /**
   * Allowed origins for CORS
   */
  allowedOrigins?: string[];
  
  /**
   * Whether to enable rate limiting
   */
  enableRateLimiting?: boolean;
  
  /**
   * Maximum number of login attempts before lockout
   */
  maxLoginAttempts?: number;
  
  /**
   * Lockout time in minutes after maximum login attempts
   */
  lockoutTime?: number;
}

/**
 * Authentication events
 */
export enum AuthEvent {
  UserRegistered = 'user:registered',
  UserLoggedIn = 'user:logged_in',
  UserLoggedOut = 'user:logged_out',
  SessionCreated = 'session:created',
  SessionRevoked = 'session:revoked',
  TokenRefreshed = 'token:refreshed',
  PasswordChanged = 'password:changed',
  EmailVerified = 'email:verified',
  PasswordResetRequested = 'password:reset_requested',
  PasswordReset = 'password:reset',
  LoginFailed = 'login:failed',
  AccountLocked = 'account:locked',
  AccountUnlocked = 'account:unlocked',
}

/**
 * Authentication service for handling user sessions and permissions
 */
export class AuthService extends EventEmitter {
  private options: Required<AuthOptions>;
  private sessions: Map<string, UserSession> = new Map();
  private users: Map<string, User> = new Map();
  private loginAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();
  
  constructor(options: AuthOptions) {
    super();
    
    this.options = {
      tokenExpiration: 24 * 60 * 60, // 24 hours
      sessionExpiration: 7 * 24 * 60 * 60, // 7 days
      requireEmailVerification: false,
      allowedOrigins: [],
      enableRateLimiting: true,
      maxLoginAttempts: 5,
      lockoutTime: 15, // minutes
      ...options,
    };
    
    // Setup cleanup interval for expired sessions
    setInterval(() => this.cleanupExpiredSessions(), 60 * 60 * 1000); // Run hourly
  }
  
  /**
   * Register a new user
   */
  async register(userData: Omit<User, 'id' | 'createdAt' | 'lastActiveAt' | 'isActive'>): Promise<User> {
    // Check if user already exists
    for (const user of this.users.values()) {
      if (user.email === userData.email) {
        throw new Error('User with this email already exists');
      }
    }
    
    const now = new Date();
    const user: User = {
      ...userData,
      id: uuidv4(),
      createdAt: now,
      lastActiveAt: now,
      isActive: true,
    };
    
    this.users.set(user.id, user);
    
    // Emit registration event
    this.emit(AuthEvent.UserRegistered, { user });
    
    return user;
  }
  
  /**
   * Authenticate a user and create a new session
   */
  async login(email: string, password: string, metadata: Record<string, any> = {}): Promise<{ user: User; session: UserSession; token: string }> {
    // Check rate limiting
    if (this.options.enableRateLimiting) {
      const attemptKey = `login:${email}`;
      const attempt = this.loginAttempts.get(attemptKey) || { count: 0, lastAttempt: new Date(0) };
      
      // Reset counter if last attempt was more than lockout time ago
      const now = new Date();
      const lockoutTimeMs = this.options.lockoutTime * 60 * 1000;
      
      if (attempt.count >= this.options.maxLoginAttempts && 
          now.getTime() - attempt.lastAttempt.getTime() < lockoutTimeMs) {
        const timeLeft = Math.ceil((attempt.lastAttempt.getTime() + lockoutTimeMs - now.getTime()) / 1000 / 60);
        this.emit(AuthEvent.LoginFailed, { email, reason: 'account_locked' });
        throw new Error(`Account locked. Please try again in ${timeLeft} minutes.`);
      }
      
      if (now.getTime() - attempt.lastAttempt.getTime() > lockoutTimeMs) {
        // Reset counter if lockout time has passed
        this.loginAttempts.delete(attemptKey);
      }
    }
    
    // Find user by email
    let user: User | undefined;
    for (const u of this.users.values()) {
      if (u.email === email) {
        user = u;
        break;
      }
    }
    
    if (!user) {
      this.recordFailedLogin(email);
      throw new Error('Invalid email or password');
    }
    
    // Check if account is active
    if (!user.isActive) {
      throw new Error('This account has been deactivated');
    }
    
    // In a real implementation, we would verify the password hash here
    // For this example, we'll just check if the password is not empty
    if (!password) {
      this.recordFailedLogin(email);
      throw new Error('Invalid email or password');
    }
    
    // Reset login attempts on successful login
    this.loginAttempts.delete(`login:${email}`);
    
    // Update last active timestamp
    user.lastActiveAt = new Date();
    this.users.set(user.id, user);
    
    // Create a new session
    const session = await this.createSession(user.id, metadata);
    
    // Generate a JWT token (simplified for this example)
    const token = this.generateToken(user, session);
    
    // Emit login event
    this.emit(AuthEvent.UserLoggedIn, { user, session });
    
    return { user, session, token };
  }
  
  /**
   * Log out a user by revoking their session
   */
  async logout(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    
    // Mark session as inactive
    session.isActive = false;
    this.sessions.set(sessionId, session);
    
    // Emit logout event
    this.emit(AuthEvent.UserLoggedOut, { session });
    this.emit(AuthEvent.SessionRevoked, { session });
  }
  
  /**
   * Validate a session token
   */
  async validateToken(token: string): Promise<{ user: User; session: UserSession } | null> {
    try {
      // In a real implementation, we would verify the JWT token here
      // For this example, we'll just parse the token as JSON
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      // Check if session exists and is active
      const session = this.sessions.get(payload.sid);
      if (!session || !session.isActive || new Date() > session.expiresAt) {
        return null;
      }
      
      // Get user
      const user = this.users.get(session.userId);
      if (!user) {
        return null;
      }
      
      // Update last active timestamp
      user.lastActiveAt = new Date();
      this.users.set(user.id, user);
      
      // Update session expiration
      session.expiresAt = new Date(Date.now() + this.options.sessionExpiration * 1000);
      this.sessions.set(session.id, session);
      
      return { user, session };
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Create a new session for a user
   */
  private async createSession(userId: string, metadata: Record<string, any> = {}): Promise<UserSession> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.options.sessionExpiration * 1000);
    
    const session: UserSession = {
      id: uuidv4(),
      userId,
      createdAt: now,
      expiresAt,
      metadata,
      isActive: true,
    };
    
    this.sessions.set(session.id, session);
    
    // Emit session created event
    this.emit(AuthEvent.SessionCreated, { session });
    
    return session;
  }
  
  /**
   * Generate a JWT token for a user session
   */
  private generateToken(user: User, session: UserSession): string {
    // In a real implementation, we would use jsonwebtoken or similar
    // This is a simplified version for demonstration
    const header = {
      alg: 'HS256', // HMAC with SHA-256
      typ: 'JWT',
    };
    
    const payload = {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sid: session.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(session.expiresAt.getTime() / 1000),
    };
    
    // In a real implementation, we would sign this with a secret key
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=+$/, '');
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=+$/, '');
    
    // Create signature (in a real implementation, this would be hashed with a secret key)
    const signature = 'mock-signature';
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }
  
  /**
   * Record a failed login attempt
   */
  private recordFailedLogin(email: string): void {
    if (!this.options.enableRateLimiting) return;
    
    const attemptKey = `login:${email}`;
    const now = new Date();
    const attempt = this.loginAttempts.get(attemptKey) || { count: 0, lastAttempt: now };
    
    attempt.count++;
    attempt.lastAttempt = now;
    this.loginAttempts.set(attemptKey, attempt);
    
    // Emit failed login event
    this.emit(AuthEvent.LoginFailed, { 
      email, 
      attempt: attempt.count,
      maxAttempts: this.options.maxLoginAttempts,
    });
    
    // Check if account should be locked
    if (attempt.count >= this.options.maxLoginAttempts) {
      this.emit(AuthEvent.AccountLocked, { 
        email,
        lockedUntil: new Date(now.getTime() + this.options.lockoutTime * 60 * 1000),
      });
    }
  }
  
  /**
   * Clean up expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = new Date();
    let count = 0;
    
    for (const [id, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
        count++;
      }
    }
    
    if (count > 0) {
      console.log(`[AuthService] Cleaned up ${count} expired sessions`);
    }
  }
  
  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): UserSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.userId === userId && session.isActive);
  }
  
  /**
   * Revoke a specific session
   */
  revokeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.isActive) return false;
    
    session.isActive = false;
    this.sessions.set(sessionId, session);
    
    this.emit(AuthEvent.SessionRevoked, { session });
    return true;
  }
  
  /**
   * Revoke all sessions for a user (except the current one if specified)
   */
  revokeAllSessions(userId: string, exceptSessionId?: string): number {
    let count = 0;
    
    for (const [id, session] of this.sessions.entries()) {
      if (session.userId === userId && session.isActive && id !== exceptSessionId) {
        session.isActive = false;
        this.sessions.set(id, session);
        count++;
        
        this.emit(AuthEvent.SessionRevoked, { session });
      }
    }
    
    return count;
  }
  
  /**
   * Change a user's password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;
    
    // In a real implementation, we would verify the current password hash
    if (!currentPassword) return false;
    
    // In a real implementation, we would hash the new password
    // For this example, we'll just update a dummy field
    
    // Emit password changed event
    this.emit(AuthEvent.PasswordChanged, { userId });
    
    // Revoke all sessions for security
    this.revokeAllSessions(userId);
    
    return true;
  }
  
  /**
   * Request a password reset
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; resetToken?: string }> {
    // Find user by email
    let user: User | undefined;
    for (const u of this.users.values()) {
      if (u.email === email) {
        user = u;
        break;
      }
    }
    
    if (!user) {
      // Don't reveal that the email doesn't exist
      return { success: true };
    }
    
    // Generate a reset token (in a real implementation, this would be a JWT with a short expiration)
    const resetToken = uuidv4();
    
    // In a real implementation, we would store the reset token with an expiration
    // and send an email with a reset link
    
    // Emit password reset requested event
    this.emit(AuthEvent.PasswordResetRequested, { 
      userId: user.id, 
      email: user.email,
      resetToken,
    });
    
    return { success: true, resetToken };
  }
  
  /**
   * Reset a user's password using a reset token
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<boolean> {
    // In a real implementation, we would validate the reset token
    // and check its expiration
    if (!resetToken) return false;
    
    // Find user by reset token (in a real implementation, we would look this up in a database)
    let userId: string | undefined;
    for (const user of this.users.values()) {
      // This is a simplified check - in reality, we'd have a proper token validation
      if (resetToken) {
        userId = user.id;
        break;
      }
    }
    
    if (!userId) return false;
    
    // In a real implementation, we would hash the new password
    // For this example, we'll just update a dummy field
    
    // Revoke all sessions for security
    this.revokeAllSessions(userId);
    
    // Emit password reset event
    this.emit(AuthEvent.PasswordReset, { userId });
    
    return true;
  }
  
  /**
   * Verify a user's email
   */
  async verifyEmail(verificationToken: string): Promise<boolean> {
    // In a real implementation, we would validate the verification token
    // and update the user's email verification status
    
    // For this example, we'll just emit the event
    this.emit(AuthEvent.EmailVerified, { verificationToken });
    
    return true;
  }
  
  /**
   * Get a user by ID
   */
  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }
  
  /**
   * Get a session by ID
   */
  getSession(sessionId: string): UserSession | undefined {
    return this.sessions.get(sessionId);
  }
}

/**
 * Default authentication options
 */
export const defaultAuthOptions: AuthOptions = {
  secretKey: process.env.AUTH_SECRET_KEY || 'your-secret-key', // In production, use a strong secret key from environment variables
  tokenExpiration: 24 * 60 * 60, // 24 hours
  sessionExpiration: 7 * 24 * 60 * 60, // 7 days
  requireEmailVerification: false,
  allowedOrigins: [],
  enableRateLimiting: true,
  maxLoginAttempts: 5,
  lockoutTime: 15, // minutes
};

/**
 * Create a new authentication service with the specified options
 */
export function createAuthService(options: Partial<AuthOptions> = {}): AuthService {
  return new AuthService({
    ...defaultAuthOptions,
    ...options,
  });
}
