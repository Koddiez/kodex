import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { validationResult, ValidationChain } from 'express-validator';
import helmet from 'helmet';

/**
 * Rate limiting configuration
 */
interface RateLimitOptions {
  /**
   * Maximum number of requests within the window
   */
  points: number;
  
  /**
   * Time window in seconds
   */
  duration: number;
  
  /**
   * Maximum number of consecutive failures before blocking
   */
  blockDuration?: number;
  
  /**
   * Custom key generator function
   */
  keyGenerator?: (req: Request) => string;
  
  /**
   * Custom error message
   */
  errorMessage?: string;
  
  /**
   * Whether to enable rate limiting (default: true)
   */
  enabled?: boolean;
}

/**
 * Default rate limit options
 */
const defaultRateLimitOptions: RateLimitOptions = {
  points: 100, // 100 requests
  duration: 60, // per 60 seconds
  blockDuration: 60 * 15, // Block for 15 minutes after too many requests
  errorMessage: 'Too many requests, please try again later.',
  enabled: process.env.NODE_ENV === 'production',
};

/**
 * Creates a rate limiter middleware
 */
export function rateLimiter(options: Partial<RateLimitOptions> = {}) {
  const opts = { ...defaultRateLimitOptions, ...options };
  
  const rateLimiter = new RateLimiterMemory({
    points: opts.points,
    duration: opts.duration,
    blockDuration: opts.blockDuration,
    keyPrefix: 'rate_limit',
  });
  
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!opts.enabled) return next();
    
    try {
      const key = opts.keyGenerator ? opts.keyGenerator(req) : req.ip;
      await rateLimiter.consume(key);
      next();
    } catch (error) {
      if (error instanceof RateLimiterRes) {
        res.set({
          'Retry-After': error.msBeforeNext / 1000,
          'X-RateLimit-Limit': opts.points,
          'X-RateLimit-Remaining': error.remainingPoints,
          'X-RateLimit-Reset': new Date(Date.now() + error.msBeforeNext).toISOString(),
        });
        
        return res.status(429).json({
          success: false,
          error: opts.errorMessage,
          retryAfter: Math.ceil(error.msBeforeNext / 1000),
        });
      }
      
      // Handle other errors
      next(error);
    }
  };
}

/**
 * Validates request data using express-validator
 */
export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  };
}

/**
 * Sanitizes request data to prevent XSS and other injection attacks
 */
export function sanitizeInput(data: any): any {
  if (!data) return data;
  
  if (typeof data === 'string') {
    // Basic XSS prevention
    return data
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeInput(item));
  }
  
  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        sanitized[key] = sanitizeInput(data[key]);
      }
    }
    return sanitized;
  }
  
  return data;
}

/**
 * Middleware to sanitize request body, query, and params
 */
export function sanitizeRequest() {
  return (req: Request, res: Response, next: NextFunction) => {
    req.body = sanitizeInput(req.body);
    req.query = sanitizeInput(req.query);
    req.params = sanitizeInput(req.params);
    next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return [
    // Prevent clickjacking
    (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Frame-Options', 'DENY');
      next();
    },
    
    // Enable XSS protection
    (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-XSS-Protection', '1; mode=block');
      next();
    },
    
    // Prevent MIME type sniffing
    (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      next();
    },
    
    // Set Referrer-Policy
    (req: Request, res: Response, next: NextFunction) => {
      res.setHeader('Referrer-Policy', 'same-origin');
      next();
    },
    
    // Set Content Security Policy
    (req: Request, res: Response, next: NextFunction) => {
      const csp = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self'",
        "connect-src 'self' https:",
        "frame-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "block-all-mixed-content",
        "upgrade-insecure-requests",
      ];
      
      res.setHeader('Content-Security-Policy', csp.join('; '));
      next();
    },
    
    // Helmet for additional security headers
    helmet({
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      ieNoOpen: true,
      xssFilter: true,
      hidePoweredBy: true,
    }),
  ];
}

/**
 * CORS configuration
 */
interface CorsOptions {
  /**
   * Allowed origins (default: ['*'])
   */
  allowedOrigins?: string[];
  
  /**
   * Allowed methods (default: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'])
   */
  allowedMethods?: string[];
  
  /**
   * Allowed headers (default: ['Content-Type', 'Authorization'])
   */
  allowedHeaders?: string[];
  
  /**
   * Exposed headers
   */
  exposedHeaders?: string[];
  
  /**
   * Whether to allow credentials
   */
  credentials?: boolean;
  
  /**
   * Max age in seconds
   */
  maxAge?: number;
}

/**
 * CORS middleware
 */
export function cors(options: CorsOptions = {}) {
  const {
    allowedOrigins = ['*'],
    allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    exposedHeaders = [],
    credentials = true,
    maxAge = 600,
  } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin || '';
    
    // Check if origin is allowed
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin || '*');
      
      if (credentials) {
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }
      
      // Handle preflight requests
      if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', allowedMethods.join(', '));
        res.setHeader('Access-Control-Allow-Headers', allowedHeaders.join(', '));
        
        if (exposedHeaders.length > 0) {
          res.setHeader('Access-Control-Expose-Headers', exposedHeaders.join(', '));
        }
        
        res.setHeader('Access-Control-Max-Age', maxAge.toString());
        return res.status(204).end();
      }
    }
    
    next();
  };
}

/**
 * Request logging middleware
 */
export function requestLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const { method, originalUrl, ip } = req;
    
    // Log request start
    console.log(`[${new Date().toISOString()}] ${method} ${originalUrl} from ${ip}`);
    
    // Log response finish
    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length') || 0;
      const responseTime = Date.now() - start;
      
      console.log(
        `[${new Date().toISOString()}] ${method} ${originalUrl} ${statusCode} ${contentLength}b - ${responseTime}ms`
      );
    });
    
    next();
  };
}

/**
 * Error handling middleware
 */
export function errorHandler() {
  return (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    
    const statusCode = err.statusCode || 500;
    const message = statusCode === 500 ? 'Internal Server Error' : err.message;
    
    res.status(statusCode).json({
      success: false,
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  };
}

/**
 * No cache middleware
 */
export function noCache() {
  return (req: Request, res: Response, next: NextFunction) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store',
    });
    
    next();
  };
}

/**
 * Validate API key middleware
 */
export function validateApiKey(validApiKeys: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'API key is required',
      });
    }
    
    if (!validApiKeys.includes(apiKey as string)) {
      return res.status(403).json({
        success: false,
        error: 'Invalid API key',
      });
    }
    
    next();
  };
}

/**
 * Validate JWT token middleware
 */
export function validateJwt(authService: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'No token provided',
        });
      }
      
      const token = authHeader.split(' ')[1];
      const result = await authService.validateToken(token);
      
      if (!result) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired token',
        });
      }
      
      // Attach user and session to request
      (req as any).user = result.user;
      (req as any).session = result.session;
      
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
  };
}

/**
 * Role-based access control middleware
 */
export function requireRole(roles: string | string[]) {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }
    
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
    }
    
    next();
  };
}

/**
 * Request validation middleware
 */
export function validateRequest(schema: any) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validateAsync(req.body, {
        abortEarly: false,
        allowUnknown: true,
        stripUnknown: true,
      });
      
      next();
    } catch (error: any) {
      const errors = error.details.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      
      return res.status(400).json({
        success: false,
        errors,
      });
    }
  };
}

/**
 * Request sanitization middleware
 */
export function sanitizeRequest() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Sanitize request body
    if (req.body) {
      req.body = sanitizeInput(req.body);
    }
    
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeInput(req.query);
    }
    
    // Sanitize URL parameters
    if (req.params) {
      req.params = sanitizeInput(req.params);
    }
    
    next();
  };
}

/**
 * Request timeout middleware
 */
export function timeout(ms: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'Request timeout',
        });
      }
    }, ms);
    
    // Clear timeout on response finish
    res.on('finish', () => {
      clearTimeout(timeoutId);
    });
    
    next();
  };
}

/**
 * Request size limit middleware
 */
export function requestSizeLimit(limit: string) {
  const bytes = parseBytes(limit);
  
  return (req: Request, res: Response, next: NextFunction) => {
    let received = 0;
    
    // Check content length
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    
    if (contentLength > bytes) {
      return res.status(413).json({
        success: false,
        error: `Request entity too large. Maximum size is ${limit}.`,
      });
    }
    
    // Track received data
    req.on('data', (chunk) => {
      received += chunk.length;
      
      if (received > bytes) {
        req.destroy();
        
        if (!res.headersSent) {
          return res.status(413).json({
            success: false,
            error: `Request entity too large. Maximum size is ${limit}.`,
          });
        }
      }
    });
    
    next();
  };
}

/**
 * Parse byte string to number
 */
function parseBytes(str: string): number {
  const match = str.match(/^(\d+)([bkmg]?)$/i);
  
  if (!match) {
    throw new Error('Invalid byte format');
  }
  
  const num = parseInt(match[1], 10);
  const unit = (match[2] || 'b').toLowerCase();
  
  switch (unit) {
    case 'b':
      return num;
    case 'k':
      return num * 1024;
    case 'm':
      return num * 1024 * 1024;
    case 'g':
      return num * 1024 * 1024 * 1024;
    default:
      throw new Error(`Unknown unit: ${unit}`);
  }
}

/**
 * Security middleware stack
 */
export const securityMiddleware = [
  // Security headers
  ...securityHeaders(),
  
  // CORS
  cors({
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  }),
  
  // Rate limiting
  rateLimiter({
    points: 100, // 100 requests
    duration: 60, // per 60 seconds
  }),
  
  // Request logging
  requestLogger(),
  
  // Sanitize input
  sanitizeRequest(),
  
  // No cache
  noCache(),
  
  // Request timeout
  timeout(30000), // 30 seconds
  
  // Request size limit
  requestSizeLimit('10mb'),
];
