import { NextApiRequest, NextApiResponse } from 'next'
import { ApiResponse } from '@/types/common'
import { ApiErrorCode } from '@/types/api'

export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  DEPLOYMENT_ERROR = 'DEPLOYMENT_ERROR',
  COLLABORATION_ERROR = 'COLLABORATION_ERROR',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR'
}

export interface ErrorContext {
  requestId?: string
  userId?: string
  userAgent?: string
  ip?: string
  method?: string
  url?: string
  timestamp: Date
  stack?: string
  metadata?: Record<string, unknown>
}

export interface ErrorResponse {
  type: ErrorType
  message: string
  details?: unknown
  code: string
  timestamp: Date
  requestId: string
  shouldRetry?: boolean
}

export class AppError extends Error {
  public readonly type: ErrorType
  public readonly code: string
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: ErrorContext
  public readonly shouldRetry: boolean

  constructor(
    type: ErrorType,
    message: string,
    statusCode: number = 500,
    code?: string,
    isOperational: boolean = true,
    shouldRetry: boolean = false,
    context?: ErrorContext
  ) {
    super(message)
    
    this.type = type
    this.code = code || type
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.shouldRetry = shouldRetry
    this.context = context
    
    Error.captureStackTrace(this, this.constructor)
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler
  private errorCounts: Map<string, number> = new Map()
  private lastErrorTime: Map<string, number> = new Map()

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  public handle(error: Error | AppError, context?: ErrorContext): ErrorResponse {
    const errorResponse = this.createErrorResponse(error, context)
    
    // Log the error
    this.logError(error, context)
    
    // Track error frequency
    this.trackError(errorResponse.type)
    
    // Send to monitoring service if configured
    this.sendToMonitoring(errorResponse, context)
    
    return errorResponse
  }

  public handleApiError(
    error: Error | AppError,
    req: NextApiRequest,
    res: NextApiResponse<ApiResponse>
  ): void {
    const context: ErrorContext = {
      requestId: this.generateRequestId(),
      userId: (req as any).user?.id,
      userAgent: req.headers['user-agent'] || undefined,
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || undefined,
      method: req.method || undefined,
      url: req.url || undefined,
      timestamp: new Date(),
      stack: error.stack || undefined
    }

    const errorResponse = this.handle(error, context)
    
    const statusCode = error instanceof AppError ? error.statusCode : 500
    
    res.status(statusCode).json({
      success: false,
      error: {
        code: errorResponse.code,
        message: errorResponse.message,
        details: process.env.NODE_ENV === 'development' ? errorResponse.details : undefined
      },
      meta: {
        timestamp: errorResponse.timestamp,
        requestId: errorResponse.requestId
      }
    })
  }

  private createErrorResponse(error: Error | AppError, context?: ErrorContext): ErrorResponse {
    const requestId = context?.requestId || this.generateRequestId()
    
    if (error instanceof AppError) {
      return {
        type: error.type,
        message: error.message,
        details: error.context?.metadata,
        code: error.code,
        timestamp: new Date(),
        requestId,
        shouldRetry: error.shouldRetry
      }
    }

    // Handle known error types
    const errorType = this.classifyError(error)
    
    return {
      type: errorType,
      message: this.sanitizeErrorMessage(error.message),
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: errorType,
      timestamp: new Date(),
      requestId,
      shouldRetry: this.shouldRetry(errorType)
    }
  }

  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase()
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION_ERROR
    }
    
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return ErrorType.AUTHENTICATION_ERROR
    }
    
    if (message.includes('forbidden') || message.includes('permission')) {
      return ErrorType.AUTHORIZATION_ERROR
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return ErrorType.RESOURCE_NOT_FOUND
    }
    
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorType.RATE_LIMIT_EXCEEDED
    }
    
    if (message.includes('network') || message.includes('connection')) {
      return ErrorType.NETWORK_ERROR
    }
    
    if (message.includes('database') || message.includes('mongo')) {
      return ErrorType.DATABASE_ERROR
    }
    
    return ErrorType.SYSTEM_ERROR
  }

  private sanitizeErrorMessage(message: string): string {
    // Remove sensitive information from error messages
    return message
      .replace(/password[=:]\s*\S+/gi, 'password=***')
      .replace(/token[=:]\s*\S+/gi, 'token=***')
      .replace(/key[=:]\s*\S+/gi, 'key=***')
      .replace(/secret[=:]\s*\S+/gi, 'secret=***')
  }

  private shouldRetry(errorType: ErrorType): boolean {
    const retryableErrors = [
      ErrorType.NETWORK_ERROR,
      ErrorType.RATE_LIMIT_EXCEEDED,
      ErrorType.SYSTEM_ERROR
    ]
    
    return retryableErrors.includes(errorType)
  }

  private logError(error: Error | AppError, context?: ErrorContext): void {
    const logData = {
      message: error.message,
      type: error instanceof AppError ? error.type : 'UNKNOWN_ERROR',
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    }

    if (error instanceof AppError && error.statusCode >= 500) {
      console.error('🚨 Server Error:', JSON.stringify(logData, null, 2))
    } else if (error instanceof AppError && error.statusCode >= 400) {
      console.warn('⚠️ Client Error:', JSON.stringify(logData, null, 2))
    } else {
      console.error('❌ Unexpected Error:', JSON.stringify(logData, null, 2))
    }
  }

  private trackError(errorType: ErrorType): void {
    const count = this.errorCounts.get(errorType) || 0
    this.errorCounts.set(errorType, count + 1)
    this.lastErrorTime.set(errorType, Date.now())
  }

  private sendToMonitoring(errorResponse: ErrorResponse, context?: ErrorContext): void {
    // In a production environment, you would send this to a monitoring service
    // like Sentry, DataDog, or custom analytics
    if (process.env.NODE_ENV === 'production' && process.env.MONITORING_ENDPOINT) {
      // Implementation would go here
      console.log('📊 Sending error to monitoring service:', {
        error: errorResponse,
        context
      })
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  public getErrorStats(): Record<string, { count: number; lastOccurrence: Date }> {
    const stats: Record<string, { count: number; lastOccurrence: Date }> = {}
    
    for (const [errorType, count] of this.errorCounts.entries()) {
      const lastTime = this.lastErrorTime.get(errorType)
      stats[errorType] = {
        count,
        lastOccurrence: new Date(lastTime || 0)
      }
    }
    
    return stats
  }

  public clearStats(): void {
    this.errorCounts.clear()
    this.lastErrorTime.clear()
  }
}

// Convenience functions for creating common errors
export const createValidationError = (message: string, details?: unknown): AppError => {
  return new AppError(ErrorType.VALIDATION_ERROR, message, 400, ApiErrorCode.VALIDATION_ERROR, true, false, {
    timestamp: new Date(),
    metadata: details
  })
}

export const createAuthenticationError = (message: string = 'Authentication required'): AppError => {
  return new AppError(ErrorType.AUTHENTICATION_ERROR, message, 401, ApiErrorCode.AUTHENTICATION_ERROR)
}

export const createAuthorizationError = (message: string = 'Insufficient permissions'): AppError => {
  return new AppError(ErrorType.AUTHORIZATION_ERROR, message, 403, ApiErrorCode.AUTHORIZATION_ERROR)
}

export const createNotFoundError = (resource: string = 'Resource'): AppError => {
  return new AppError(ErrorType.RESOURCE_NOT_FOUND, `${resource} not found`, 404, ApiErrorCode.NOT_FOUND)
}

export const createRateLimitError = (message: string = 'Rate limit exceeded'): AppError => {
  return new AppError(ErrorType.RATE_LIMIT_EXCEEDED, message, 429, ApiErrorCode.RATE_LIMIT_EXCEEDED, true, true)
}

export const createSystemError = (message: string, shouldRetry: boolean = false): AppError => {
  return new AppError(ErrorType.SYSTEM_ERROR, message, 500, ApiErrorCode.INTERNAL_SERVER_ERROR, true, shouldRetry)
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance()