// Simple mock auth service for benchmarking
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

function createAuthService(config = {}) {
  const {
    secretKey = 'test-secret-key',
    tokenExpiration = 3600, // 1 hour
    sessionExpiration = 86400, // 24 hours
    requireEmailVerification = false,
  } = config;

  // In-memory storage for testing
  const users = new Map();
  const sessions = new Map();
  const tokens = new Map();

  // Helper to hash passwords (simplified for benchmarking)
  function hashPassword(password) {
    return crypto
      .createHash('sha256')
      .update(password + secretKey)
      .digest('hex');
  }

  // Generate a simple JWT-like token (not cryptographically secure)
  function generateToken(userId) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        sub: userId,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + tokenExpiration,
      })
    ).toString('base64');
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(`${header}.${payload}`)
      .digest('base64');
    return `${header}.${payload}.${signature}`;
  }

  // Mock user registration
  async function register(userData) {
    const { email, password, ...rest } = userData;
    
    if (users.has(email)) {
      throw new Error('User already exists');
    }

    const user = {
      id: uuidv4(),
      email,
      password: hashPassword(password),
      isVerified: !requireEmailVerification,
      ...rest,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    users.set(email, user);
    return { id: user.id, email: user.email };
  }

  // Mock user login
  async function login(email, password, options = {}) {
    const user = users.get(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.password !== hashPassword(password)) {
      throw new Error('Invalid credentials');
    }

    if (requireEmailVerification && !user.isVerified) {
      throw new Error('Email not verified');
    }

    const token = generateToken(user.id);
    const session = {
      id: uuidv4(),
      userId: user.id,
      token,
      ip: options.ip || '127.0.0.1',
      userAgent: options.userAgent || 'benchmark-script',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + sessionExpiration * 1000).toISOString(),
    };

    sessions.set(session.id, session);
    tokens.set(token, session);

    return {
      user: { id: user.id, email: user.email, name: user.name },
      token,
      session: { id: session.id },
    };
  }

  // Mock token validation
  async function validateToken(token) {
    const session = tokens.get(token);
    if (!session) {
      throw new Error('Invalid or expired token');
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      tokens.delete(token);
      sessions.delete(session.id);
      throw new Error('Session expired');
    }

    const user = Array.from(users.values()).find(u => u.id === session.userId);
    if (!user) {
      tokens.delete(token);
      sessions.delete(session.id);
      throw new Error('User not found');
    }

    // Extend session
    session.expiresAt = new Date(Date.now() + sessionExpiration * 1000).toISOString();
    sessions.set(session.id, session);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  }

  // Mock password reset
  async function requestPasswordReset(email) {
    const user = users.get(email);
    if (!user) {
      // Don't reveal that the user doesn't exist
      return { success: true };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    users.set(email, user);

    return { success: true };
  }

  // Mock password reset confirmation
  async function resetPassword(token, newPassword) {
    const user = Array.from(users.values()).find(
      u => u.resetToken === token && u.resetTokenExpiry > Date.now()
    );

    if (!user) {
      throw new Error('Invalid or expired reset token');
    }

    user.password = hashPassword(newPassword);
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    users.set(user.email, user);

    // Invalidate all sessions for this user
    for (const [sessionId, session] of sessions.entries()) {
      if (session.userId === user.id) {
        tokens.delete(session.token);
        sessions.delete(sessionId);
      }
    }

    return { success: true };
  }

  return {
    register,
    login,
    validateToken,
    requestPasswordReset,
    resetPassword,
    // Export for testing
    _users: users,
    _sessions: sessions,
    _tokens: tokens,
  };
}

module.exports = { createAuthService };
