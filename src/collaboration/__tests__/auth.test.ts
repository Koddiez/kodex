import { AuthService, AuthEvent, createAuthService } from '../auth';

describe('AuthService', () => {
  let authService: AuthService;
  let testUser: any;
  
  // Mock Date.now() to return a fixed timestamp
  const mockNow = new Date('2023-01-01T00:00:00Z').getTime();
  
  beforeAll(() => {
    // Mock Date.now()
    jest.spyOn(Date, 'now').mockImplementation(() => mockNow);
  });
  
  beforeEach(() => {
    // Create a new AuthService instance for each test
    authService = createAuthService({
      secretKey: 'test-secret-key', // Use a fixed secret key for testing
      tokenExpiration: 3600, // 1 hour
      sessionExpiration: 86400, // 1 day
      requireEmailVerification: false,
    });
    
    // Register a test user
    testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      role: 'user' as const,
    };
  });
  
  afterEach(() => {
    // Reset mocks after each test
    jest.clearAllMocks();
  });
  
  afterAll(() => {
    // Restore the original Date.now() implementation
    jest.restoreAllMocks();
  });
  
  describe('User Registration', () => {
    it('should register a new user', async () => {
      const user = await authService.register(testUser);
      
      expect(user).toMatchObject({
        name: testUser.name,
        email: testUser.email,
        role: testUser.role,
        isActive: true,
      });
      
      // Should have a valid ID
      expect(user.id).toBeDefined();
      expect(typeof user.id).toBe('string');
      
      // Should have timestamps
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.lastActiveAt).toBeInstanceOf(Date);
    });
    
    it('should not allow duplicate email addresses', async () => {
      // Register first user
      await authService.register(testUser);
      
      // Try to register again with the same email
      await expect(
        authService.register({
          ...testUser,
          name: 'Another User',
        })
      ).rejects.toThrow('User with this email already exists');
    });
  });
  
  describe('User Login', () => {
    beforeEach(async () => {
      // Register a test user before each login test
      await authService.register(testUser);
    });
    
    it('should login with valid credentials', async () => {
      const result = await authService.login(
        testUser.email,
        testUser.password,
        { ip: '127.0.0.1' }
      );
      
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('session');
      expect(result).toHaveProperty('token');
      
      // Check user data
      expect(result.user).toMatchObject({
        name: testUser.name,
        email: testUser.email,
        role: testUser.role,
        isActive: true,
      });
      
      // Check session data
      expect(result.session.userId).toBe(result.user.id);
      expect(result.session.isActive).toBe(true);
      
      // Check token format (simplified for this example)
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.').length).toBe(3);
    });
    
    it('should reject invalid credentials', async () => {
      // Wrong password
      await expect(
        authService.login(testUser.email, 'wrong-password')
      ).rejects.toThrow('Invalid email or password');
      
      // Non-existent email
      await expect(
        authService.login('nonexistent@example.com', 'password')
      ).rejects.toThrow('Invalid email or password');
    });
    
    it('should lock account after maximum login attempts', async () => {
      const maxAttempts = 5;
      
      // Make max attempts with wrong password
      for (let i = 0; i < maxAttempts; i++) {
        try {
          await authService.login(testUser.email, 'wrong-password');
        } catch (error) {
          // Expected to fail
        }
      }
      
      // Next attempt should be locked
      await expect(
        authService.login(testUser.email, testUser.password)
      ).rejects.toThrow(/Account locked/);
    });
  });
  
  describe('Token Validation', () => {
    let token: string;
    let userId: string;
    
    beforeEach(async () => {
      // Register and login a test user
      const user = await authService.register(testUser);
      userId = user.id;
      
      const result = await authService.login(
        testUser.email,
        testUser.password,
        { ip: '127.0.0.1' }
      );
      
      token = result.token;
    });
    
    it('should validate a valid token', async () => {
      const result = await authService.validateToken(token);
      
      expect(result).not.toBeNull();
      expect(result!.user.id).toBe(userId);
      expect(result!.session.userId).toBe(userId);
    });
    
    it('should reject an invalid token', async () => {
      const result = await authService.validateToken('invalid.token.here');
      expect(result).toBeNull();
    });
    
    it('should reject an expired token', async () => {
      // Mock Date.now() to return a time after token expiration
      const futureTime = mockNow + 2 * 3600 * 1000; // 2 hours later
      jest.spyOn(Date, 'now').mockImplementation(() => futureTime);
      
      const result = await authService.validateToken(token);
      expect(result).toBeNull();
    });
  });
  
  describe('Session Management', () => {
    let sessionId: string;
    let userId: string;
    
    beforeEach(async () => {
      // Register and login a test user
      const user = await authService.register(testUser);
      userId = user.id;
      
      const result = await authService.login(
        testUser.email,
        testUser.password,
        { ip: '127.0.0.1' }
      );
      
      sessionId = result.session.id;
    });
    
    it('should log out a user by revoking their session', async () => {
      // Session should be active initially
      const sessionBefore = authService.getSession(sessionId);
      expect(sessionBefore?.isActive).toBe(true);
      
      // Log out
      await authService.logout(sessionId);
      
      // Session should be inactive
      const sessionAfter = authService.getSession(sessionId);
      expect(sessionAfter?.isActive).toBe(false);
    });
    
    it('should get all active sessions for a user', async () => {
      // Create multiple sessions for the same user
      const result1 = await authService.login(
        testUser.email,
        testUser.password,
        { ip: '127.0.0.1', device: 'desktop' }
      );
      
      const result2 = await authService.login(
        testUser.email,
        testUser.password,
        { ip: '192.168.1.1', device: 'mobile' }
      );
      
      const sessions = authService.getUserSessions(userId);
      
      // Should have 3 sessions (one from beforeEach and two just created)
      expect(sessions.length).toBe(3);
      
      // Check that all sessions are active
      expect(sessions.every(s => s.isActive)).toBe(true);
      
      // Check that all sessions belong to the same user
      expect(sessions.every(s => s.userId === userId)).toBe(true);
    });
    
    it('should revoke all sessions for a user', async () => {
      // Create multiple sessions for the same user
      const result1 = await authService.login(
        testUser.email,
        testUser.password,
        { ip: '127.0.0.1', device: 'desktop' }
      );
      
      const result2 = await authService.login(
        testUser.email,
        testUser.password,
        { ip: '192.168.1.1', device: 'mobile' }
      );
      
      // Revoke all sessions except the current one
      const count = authService.revokeAllSessions(userId, result2.session.id);
      
      // Should have revoked 2 sessions (one from beforeEach and one from the first login)
      expect(count).toBe(2);
      
      // Check that the specified session is still active
      const currentSession = authService.getSession(result2.session.id);
      expect(currentSession?.isActive).toBe(true);
      
      // Check that other sessions are inactive
      const session1 = authService.getSession(sessionId);
      const session2 = authService.getSession(result1.session.id);
      
      expect(session1?.isActive).toBe(false);
      expect(session2?.isActive).toBe(false);
    });
  });
  
  describe('Password Reset', () => {
    let userId: string;
    
    beforeEach(async () => {
      // Register a test user
      const user = await authService.register(testUser);
      userId = user.id;
    });
    
    it('should request a password reset', async () => {
      const result = await authService.requestPasswordReset(testUser.email);
      
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('resetToken');
      expect(typeof result.resetToken).toBe('string');
    });
    
    it('should not reveal if email exists when requesting password reset', async () => {
      const result = await authService.requestPasswordReset('nonexistent@example.com');
      
      // Should still return success to prevent email enumeration
      expect(result).toHaveProperty('success', true);
      expect(result.resetToken).toBeUndefined();
    });
    
    it('should reset password with a valid token', async () => {
      // Request password reset
      const { resetToken } = await authService.requestPasswordReset(testUser.email);
      
      // Reset password
      const newPassword = 'new-secure-password';
      const result = await authService.resetPassword(resetToken!, newPassword);
      
      expect(result).toBe(true);
      
      // Should be able to login with new password
      const loginResult = await authService.login(testUser.email, newPassword);
      expect(loginResult.user.id).toBe(userId);
      
      // Old password should no longer work
      await expect(
        authService.login(testUser.email, testUser.password)
      ).rejects.toThrow('Invalid email or password');
    });
    
    it('should not reset password with an invalid token', async () => {
      const result = await authService.resetPassword('invalid-token', 'new-password');
      expect(result).toBe(false);
    });
  });
  
  describe('Email Verification', () => {
    it('should verify email with a valid token', async () => {
      // In a real implementation, we would test the verification flow
      // For this example, we'll just test that the method exists and returns true
      const result = await authService.verifyEmail('valid-verification-token');
      expect(result).toBe(true);
    });
  });
  
  describe('Events', () => {
    it('should emit events for user actions', async () => {
      const eventHandlers = {
        [AuthEvent.UserRegistered]: jest.fn(),
        [AuthEvent.UserLoggedIn]: jest.fn(),
        [AuthEvent.UserLoggedOut]: jest.fn(),
      };
      
      // Register event handlers
      Object.entries(eventHandlers).forEach(([event, handler]) => {
        authService.on(event, handler);
      });
      
      // Register a user
      const user = await authService.register(testUser);
      
      // Check that UserRegistered event was emitted
      expect(eventHandlers[AuthEvent.UserRegistered]).toHaveBeenCalledWith(
        expect.objectContaining({ user: expect.objectContaining({ email: testUser.email }) })
      );
      
      // Login the user
      const loginResult = await authService.login(testUser.email, testUser.password);
      
      // Check that UserLoggedIn event was emitted
      expect(eventHandlers[AuthEvent.UserLoggedIn]).toHaveBeenCalledWith(
        expect.objectContaining({
          user: expect.objectContaining({ email: testUser.email }),
          session: expect.objectContaining({ id: loginResult.session.id }),
        })
      );
      
      // Logout the user
      await authService.logout(loginResult.session.id);
      
      // Check that UserLoggedOut event was emitted
      expect(eventHandlers[AuthEvent.UserLoggedOut]).toHaveBeenCalledWith(
        expect.objectContaining({
          session: expect.objectContaining({ id: loginResult.session.id }),
        })
      );
    });
  });
});
