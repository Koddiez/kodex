import { NextApiRequest, NextApiResponse } from 'next'
import { ApiResponse } from './common'

// Extended API request with user context
export interface AuthenticatedApiRequest extends NextApiRequest {
  user?: {
    id: string
    email: string
    name: string
    plan: 'free' | 'pro' | 'enterprise'
  }
}

// API handler type with proper typing
export type ApiHandler<T = unknown> = (
  req: AuthenticatedApiRequest,
  res: NextApiResponse<ApiResponse<T>>
) => Promise<void> | void

// HTTP methods
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

// API error codes
export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  BAD_REQUEST = 'BAD_REQUEST'
}

// Request validation schemas
export interface ValidationSchema {
  body?: Record<string, unknown>
  query?: Record<string, unknown>
  params?: Record<string, unknown>
}

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

// API middleware types
export type ApiMiddleware = (
  req: AuthenticatedApiRequest,
  res: NextApiResponse,
  next: () => void
) => Promise<void> | void