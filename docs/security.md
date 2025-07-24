# Security and Authentication

This document provides an overview of the security features implemented in the Kodex application, including authentication, authorization, and secure communication.

## Table of Contents

- [Authentication Service](#authentication-service)
- [Security Middleware](#security-middleware)
- [WebSocket Security](#websocket-security)
- [Rate Limiting](#rate-limiting)
- [Input Validation](#input-validation)
- [CORS Configuration](#cors-configuration)
- [Security Headers](#security-headers)
- [Best Practices](#best-practices)

## Authentication Service

The `AuthService` provides user authentication and session management.

### Features

- User registration and login
- Session management
- Password reset flow
- Email verification
- Role-based access control
- Rate limiting for login attempts
- Session cleanup for expired sessions

### Usage

```typescript
import { createAuthService } from '../src/collaboration/auth';

// Initialize with options
const authService = createAuthService({
  secretKey: process.env.AUTH_SECRET_KEY || 'your-secret-key',
  tokenExpiration: 24 * 60 * 60, // 24 hours
  sessionExpiration: 7 * 24 * 60 * 60, // 7 days
  requireEmailVerification: true,
});

// Register a new user
const user = await authService.register({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'secure-password',
  role: 'user',
});

// Login
const { user, session, token } = await authService.login(
  'john@example.com',
  'secure-password',
  { ip: '127.0.0.1' }
);

// Validate token
const result = await authService.validateToken(token);
if (result) {
  const { user, session } = result;
  // User is authenticated
}
```

## Security Middleware

The security middleware provides essential security features for HTTP requests.

### Usage

```typescript
import express from 'express';
import { securityMiddleware } from '../src/utils/security';

const app = express();

// Apply security middleware
app.use(securityMiddleware);

// Your routes
app.get('/api/data', (req, res) => {
  res.json({ message: 'Secure data' });
});
```

### Included Middleware

- **CORS** - Cross-Origin Resource Sharing
- **Rate Limiting** - Prevents brute force attacks
- **Security Headers** - Adds security-related HTTP headers
- **Request Sanitization** - Prevents XSS and injection attacks
- **Request Validation** - Validates request payloads
- **Error Handling** - Consistent error responses

## WebSocket Security

The `WSSecurity` class provides secure WebSocket communication with authentication and rate limiting.

### Features

- Authentication for WebSocket connections
- Rate limiting per connection
- Room-based access control
- Automatic ping/pong for connection health
- Cleanup of dead connections
- Event-based architecture

### Usage

```typescript
import { Server } from 'http';
import { WebSocketServer } from 'ws';
import { createWSSecurity } from '../src/collaboration/wsSecurity';
import { createAuthService } from '../src/collaboration/auth';

const server = new Server();
const wss = new WebSocketServer({ server });
const authService = createAuthService({
  secretKey: process.env.AUTH_SECRET_KEY || 'your-secret-key',
});

// Initialize WebSocket security
const wsSecurity = createWSSecurity(wss, {
  authService,
  maxConnectionsPerIp: 10,
  maxMessagesPerSecond: 50,
  requireAuth: true,
  allowedOrigins: ['https://yourdomain.com'],
  debug: process.env.NODE_ENV === 'development',
});

// Handle custom messages
wss.on('message', ({ ws, message, broadcast, reply }) => {
  if (message.type === 'custom') {
    // Process message
    reply({ type: 'response', data: 'Received' });
    
    // Broadcast to room
    if (message.roomId) {
      broadcast({ type: 'announcement', data: 'New message' });
    }
  }
});

// Handle disconnections
wss.on('disconnect', ({ connectionId, userId }) => {
  console.log(`User ${userId} disconnected (${connectionId})`);
});

server.listen(3000);
```

## Rate Limiting

### Global Rate Limiting

Applied to all incoming requests:

```typescript
import { rateLimiter } from '../src/utils/security';

// 100 requests per minute per IP
app.use(rateLimiter({
  points: 100,
  duration: 60, // seconds
  blockDuration: 300, // Block for 5 minutes after limit
  errorMessage: 'Too many requests, please try again later.',
}));
```

### Endpoint-Specific Rate Limiting

```typescript
app.post('/api/login', 
  rateLimiter({
    points: 5, // 5 login attempts
    duration: 60 * 15, // 15 minutes
    keyGenerator: (req) => `login:${req.ip}`,
  }),
  loginHandler
);
```

## Input Validation

### Request Validation

```typescript
import { validate } from '../src/utils/security';
import { body } from 'express-validator';

app.post('/api/users', 
  validate([
    body('name').isString().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 8 }),
  ]),
  userController.create
);
```

### Input Sanitization

All request inputs are automatically sanitized to prevent XSS and injection attacks.

## CORS Configuration

Configure CORS for your API:

```typescript
import { cors } from '../src/utils/security';

app.use(cors({
  allowedOrigins: ['https://yourdomain.com'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 600, // seconds
}));
```

## Security Headers

Security headers are automatically applied by the security middleware:

- **Content Security Policy (CSP)** - Restricts resource loading
- **X-Frame-Options** - Prevents clickjacking
- **X-XSS-Protection** - Enables XSS filtering
- **X-Content-Type-Options** - Prevents MIME sniffing
- **Strict-Transport-Security** - Enforces HTTPS
- **Referrer-Policy** - Controls referrer information

## Best Practices

1. **Use Environment Variables** for sensitive configuration
2. **Enable HTTPS** for all communications
3. **Keep Dependencies Updated** to patch security vulnerabilities
4. **Use Strong Passwords** and enforce password policies
5. **Implement Rate Limiting** to prevent abuse
6. **Validate All Inputs** to prevent injection attacks
7. **Use Secure Cookies** with HttpOnly and Secure flags
8. **Implement CSRF Protection** for forms and state-changing requests
9. **Log Security Events** for monitoring and auditing
10. **Regular Security Audits** to identify and fix vulnerabilities

## Example: Securing an API Endpoint

```typescript
import { 
  validate, 
  validateJwt, 
  requireRole 
} from '../src/utils/security';
import { body } from 'express-validator';

// Protected API endpoint with validation and role-based access
app.post('/api/admin/users',
  validateJwt(authService), // Require JWT authentication
  requireRole('admin'),     // Require admin role
  validate([               // Validate request body
    body('email').isEmail(),
    body('role').isIn(['user', 'editor', 'admin']),
  ]),
  async (req, res) => {
    // Request is authenticated, authorized, and validated
    const { email, role } = req.body;
    // Create user...
    res.status(201).json({ success: true });
  }
);
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Verify allowed origins in CORS configuration
   - Ensure credentials are properly configured if using cookies

2. **Rate Limiting**
   - Check if you've exceeded the rate limit
   - Adjust limits in the rate limiter configuration

3. **Authentication Failures**
   - Verify the JWT token is valid and not expired
   - Check that the token is sent in the Authorization header

4. **WebSocket Connection Issues**
   - Verify the WebSocket server is running
   - Check for CORS issues with WebSocket connections
   - Ensure the client is sending the correct authentication token

For additional help, refer to the source code documentation or open an issue in the repository.
