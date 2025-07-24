import { Request, Response, NextFunction } from 'express';
import { 
  rateLimiter, 
  validate, 
  sanitizeInput, 
  cors, 
  requestLogger, 
  errorHandler, 
  noCache, 
  validateApiKey,
  validateJwt,
  requireRole,
  validateRequest as validateRequestMiddleware,
  requestSizeLimit,
  timeout,
} from '../security';
import { AuthService } from '../../collaboration/auth';
import { validationResult, body } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';

// Mock Express request/response objects
const mockRequest = (options: Partial<Request> = {}) => ({
  headers: {},
  method: 'GET',
  url: '/test',
  ip: '127.0.0.1',
  ...options,
}) as Request;

const mockResponse = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.set = jest.fn().mockReturnValue(res);
  res.header = jest.fn().mockReturnValue(res);
  res.on = jest.fn().mockImplementation((event, callback) => {
    if (event === 'finish') {
      callback();
    }
    return res;
  });
  res.get = jest.fn();
  return res as Response;
};

const mockNext = jest.fn() as NextFunction;

describe('Security Utils', () => {
  describe('rateLimiter', () => {
    it('should allow requests under the limit', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      const middleware = rateLimiter({ points: 5, duration: 1 });
      
      // Make 5 requests (should all pass)
      for (let i = 0; i < 5; i++) {
        await middleware(req, res, mockNext);
        expect(mockNext).toHaveBeenCalledTimes(i + 1);
      }
    });
    
    it('should block requests over the limit', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      const middleware = rateLimiter({ points: 2, duration: 1 });
      
      // First 2 requests should pass
      await middleware(req, res, mockNext);
      await middleware(req, res, mockNext);
      
      // Third request should be rate limited
      await middleware(req, res, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.any(String),
        retryAfter: expect.any(Number),
      });
    });
  });
  
  describe('validate', () => {
    it('should pass validation with valid input', async () => {
      const req = mockRequest({ 
        body: { name: 'Test', email: 'test@example.com' } 
      });
      const res = mockResponse();
      
      const validation = validate([
        body('name').isString().notEmpty(),
        body('email').isEmail(),
      ]);
      
      await validation(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should return 400 with invalid input', async () => {
      const req = mockRequest({ 
        body: { name: '', email: 'invalid-email' } 
      });
      const res = mockResponse();
      
      const validation = validate([
        body('name').isString().notEmpty(),
        body('email').isEmail(),
      ]);
      
      await validation(req as Request, res as Response, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({ msg: 'Invalid value' }),
        ]),
      });
    });
  });
  
  describe('sanitizeInput', () => {
    it('should sanitize XSS payloads', () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const sanitized = sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });
    
    it('should handle nested objects', () => {
      const input = {
        name: '<b>Test</b>',
        profile: {
          bio: '<script>alert("XSS")</script>',
        },
        tags: ['<tag>', 'test']
      };
      
      const sanitized = sanitizeInput(input) as any;
      
      expect(sanitized.name).toBe('&lt;b&gt;Test&lt;/b&gt;');
      expect(sanitized.profile.bio).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
      expect(sanitized.tags[0]).toBe('&lt;tag&gt;');
      expect(sanitized.tags[1]).toBe('test');
    });
  });
  
  describe('cors', () => {
    it('should set CORS headers for allowed origin', () => {
      const req = mockRequest({ 
        headers: { origin: 'http://example.com' },
        method: 'GET'
      });
      const res = mockResponse();
      
      const corsMiddleware = cors({ 
        allowedOrigins: ['http://example.com'] 
      });
      
      corsMiddleware(req as Request, res as Response, mockNext);
      
      expect(res.set).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'http://example.com');
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should handle preflight requests', () => {
      const req = mockRequest({ 
        headers: { 
          origin: 'http://example.com',
          'access-control-request-method': 'POST',
        },
        method: 'OPTIONS'
      });
      const res = mockResponse();
      
      const corsMiddleware = cors({ 
        allowedOrigins: ['http://example.com'] 
      });
      
      corsMiddleware(req as Request, res as Response, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.set).toHaveBeenCalledWith('Access-Control-Allow-Methods', expect.any(String));
      expect(res.set).toHaveBeenCalledWith('Access-Control-Allow-Headers', expect.any(String));
    });
  });
  
  describe('requestLogger', () => {
    it('should log request information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      
      const req = mockRequest({
        method: 'GET',
        url: '/test',
        ip: '127.0.0.1'
      });
      const res = mockResponse();
      
      const logger = requestLogger();
      logger(req as Request, res as Response, mockNext);
      
      // Trigger the finish event
      (res as any).emit('finish');
      
      expect(consoleSpy).toHaveBeenCalledTimes(2);
      expect(consoleSpy.mock.calls[0][0]).toContain('GET /test from 127.0.0.1');
      
      consoleSpy.mockRestore();
    });
  });
  
  describe('errorHandler', () => {
    it('should handle errors with status code', () => {
      const err = {
        statusCode: 404,
        message: 'Not Found'
      };
      
      const req = mockRequest();
      const res = mockResponse();
      
      const handler = errorHandler();
      handler(err, req as Request, res as Response, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Not Found'
      });
    });
    
    it('should use 500 as default status code', () => {
      const err = new Error('Internal Error');
      
      const req = mockRequest();
      const res = mockResponse();
      
      const handler = errorHandler();
      handler(err, req as Request, res as Response, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Internal Server Error',
        stack: expect.any(String)
      });
    });
  });
  
  describe('noCache', () => {
    it('should set cache control headers', () => {
      const req = mockRequest();
      const res = mockResponse();
      
      const middleware = noCache();
      middleware(req as Request, res as Response, mockNext);
      
      expect(res.set).toHaveBeenCalledWith({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store',
      });
      
      expect(mockNext).toHaveBeenCalled();
    });
  });
  
  describe('validateApiKey', () => {
    it('should validate API key from header', () => {
      const req = mockRequest({
        headers: { 'x-api-key': 'valid-key' }
      });
      const res = mockResponse();
      
      const middleware = validateApiKey(['valid-key']);
      middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should validate API key from query param', () => {
      const req = mockRequest({
        query: { apiKey: 'valid-key' }
      });
      const res = mockResponse();
      
      const middleware = validateApiKey(['valid-key']);
      middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should return 401 for missing API key', () => {
      const req = mockRequest();
      const res = mockResponse();
      
      const middleware = validateApiKey(['valid-key']);
      middleware(req as Request, res as Response, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'API key is required',
      });
    });
    
    it('should return 403 for invalid API key', () => {
      const req = mockRequest({
        headers: { 'x-api-key': 'invalid-key' }
      });
      const res = mockResponse();
      
      const middleware = validateApiKey(['valid-key']);
      middleware(req as Request, res as Response, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid API key',
      });
    });
  });
  
  describe('validateJwt', () => {
    let authService: any;
    
    beforeEach(() => {
      authService = {
        validateToken: jest.fn()
      };
    });
    
    it('should validate JWT token', async () => {
      const user = { id: '123', name: 'Test User' };
      const session = { id: 'session-123' };
      
      authService.validateToken.mockResolvedValue({ user, session });
      
      const req = mockRequest({
        headers: { authorization: 'Bearer valid-token' }
      });
      const res = mockResponse();
      
      const middleware = validateJwt(authService);
      await middleware(req as Request, res as Response, mockNext);
      
      expect(authService.validateToken).toHaveBeenCalledWith('valid-token');
      expect((req as any).user).toEqual(user);
      expect((req as any).session).toEqual(session);
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should return 401 for missing token', async () => {
      const req = mockRequest();
      const res = mockResponse();
      
      const middleware = validateJwt(authService);
      await middleware(req as Request, res as Response, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'No token provided',
      });
    });
    
    it('should return 401 for invalid token', async () => {
      authService.validateToken.mockResolvedValue(null);
      
      const req = mockRequest({
        headers: { authorization: 'Bearer invalid-token' }
      });
      const res = mockResponse();
      
      const middleware = validateJwt(authService);
      await middleware(req as Request, res as Response, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Invalid or expired token',
      });
    });
  });
  
  describe('requireRole', () => {
    it('should allow access for user with required role', () => {
      const req = mockRequest();
      (req as any).user = { role: 'admin' };
      const res = mockResponse();
      
      const middleware = requireRole('admin');
      middleware(req as Request, res as Response, mockNext);
      
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should return 403 for user without required role', () => {
      const req = mockRequest();
      (req as any).user = { role: 'user' };
      const res = mockResponse();
      
      const middleware = requireRole('admin');
      middleware(req as Request, res as Response, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Insufficient permissions',
      });
    });
    
    it('should return 401 for unauthenticated user', () => {
      const req = mockRequest();
      const res = mockResponse();
      
      const middleware = requireRole('user');
      middleware(req as Request, res as Response, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Authentication required',
      });
    });
  });
  
  describe('validateRequest', () => {
    const schema = {
      validateAsync: jest.fn()
    };
    
    it('should validate request body', async () => {
      const req = mockRequest({
        body: { name: 'Test', email: 'test@example.com' }
      });
      const res = mockResponse();
      
      schema.validateAsync.mockResolvedValue({ name: 'Test', email: 'test@example.com' });
      
      const middleware = validateRequestMiddleware(schema as any);
      await middleware(req as Request, res as Response, mockNext);
      
      expect(schema.validateAsync).toHaveBeenCalledWith(
        { name: 'Test', email: 'test@example.com' },
        { abortEarly: false, allowUnknown: true, stripUnknown: true }
      );
      expect(mockNext).toHaveBeenCalled();
    });
    
    it('should return 400 for invalid request body', async () => {
      const req = mockRequest({
        body: { name: '', email: 'invalid-email' }
      });
      const res = mockResponse();
      
      schema.validateAsync.mockRejectedValue({
        details: [
          { path: ['name'], message: 'Name is required' },
          { path: ['email'], message: 'Email is invalid' },
        ]
      });
      
      const middleware = validateRequestMiddleware(schema as any);
      await middleware(req as Request, res as Response, mockNext);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        errors: [
          { field: 'name', message: 'Name is required' },
          { field: 'email', message: 'Email is invalid' },
        ],
      });
    });
  });
  
  describe('requestSizeLimit', () => {
    it('should allow requests under size limit', (done) => {
      const req = mockRequest({
        headers: { 'content-length': '1024' },
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            // Simulate receiving data in chunks
            callback(Buffer.alloc(1024, 'a'));
          } else if (event === 'end') {
            callback();
          }
          return req;
        })
      });
      const res = mockResponse();
      
      const middleware = requestSizeLimit('2kb');
      
      middleware(req as any, res as Response, (err?: any) => {
        expect(err).toBeUndefined();
        done();
      });
    });
    
    it('should reject requests over size limit', (done) => {
      const req = mockRequest({
        headers: { 'content-length': '2049' }, // Just over 2KB
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === 'data') {
            // Simulate receiving data in chunks
            callback(Buffer.alloc(2049, 'a'));
          } else if (event === 'end') {
            callback();
          }
          return req;
        })
      });
      const res = mockResponse();
      
      const middleware = requestSizeLimit('2kb');
      
      middleware(req as any, res as Response, (err?: any) => {
        expect(err).toBeDefined();
        expect(err.status).toBe(413);
        done();
      });
    });
  });
  
  describe('timeout', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should not timeout if request completes in time', () => {
      const req = mockRequest();
      const res = mockResponse();
      
      const middleware = timeout(1000);
      
      // Call the middleware
      middleware(req as Request, res as Response, mockNext);
      
      // Fast-forward time to just before timeout
      jest.advanceTimersByTime(999);
      
      // The response should not have been sent yet
      expect(res.status).not.toHaveBeenCalled();
      
      // Call next to complete the request
      mockNext();
      
      // Fast-forward past the timeout
      jest.advanceTimersByTime(2);
      
      // The timeout should not have triggered
      expect(res.status).not.toHaveBeenCalledWith(504);
    });
    
    it('should timeout if request takes too long', () => {
      const req = mockRequest();
      const res = mockResponse();
      
      const middleware = timeout(1000);
      
      // Call the middleware
      middleware(req as Request, res as Response, mockNext);
      
      // Fast-forward past the timeout
      jest.advanceTimersByTime(1001);
      
      // The timeout should have triggered
      expect(res.status).toHaveBeenCalledWith(504);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Request timeout',
      });
    });
  });
});
