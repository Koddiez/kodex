import { NextApiRequest, NextApiResponse } from 'next'
import { performanceMonitor } from './performance-monitor'

export interface APIPerformanceOptions {
  trackResponseSize?: boolean
  trackRequestSize?: boolean
  excludeEndpoints?: string[]
  sampleRate?: number // 0-1, percentage of requests to track
}

export function withAPIPerformanceTracking(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void,
  options: APIPerformanceOptions = {}
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now()
    const {
      trackResponseSize = true,
      trackRequestSize = true,
      excludeEndpoints = [],
      sampleRate = 1.0
    } = options

    // Check if we should track this request
    const shouldTrack = Math.random() < sampleRate
    const endpoint = req.url || 'unknown'
    const isExcluded = excludeEndpoints.some(excluded => endpoint.includes(excluded))

    if (!shouldTrack || isExcluded) {
      return handler(req, res)
    }

    // Track request size
    let requestSize = 0
    if (trackRequestSize && req.body) {
      requestSize = JSON.stringify(req.body).length
    }

    // Override res.end to capture response data
    let responseSize = 0
    const originalEnd = res.end
    const originalWrite = res.write

    if (trackResponseSize) {
      res.write = function(chunk: any, encoding?: any, callback?: any) {
        if (chunk) {
          responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk.toString())
        }
        return originalWrite.call(this, chunk, encoding, callback)
      }

      res.end = function(chunk?: any, encoding?: any, callback?: any) {
        if (chunk) {
          responseSize += Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk.toString())
        }
        return originalEnd.call(this, chunk, encoding, callback)
      }
    }

    try {
      // Execute the handler
      await handler(req, res)
    } catch (error) {
      // Record error metrics
      const endTime = Date.now()
      const errorMetric: any = {
        endpoint,
        method: req.method || 'UNKNOWN',
        statusCode: 500,
        responseTime: endTime - startTime,
        timestamp: new Date(),
        userId: (req as any).user?.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }
      
      if (trackRequestSize) {
        errorMetric.requestSize = requestSize
      }
      if (trackResponseSize) {
        errorMetric.responseSize = responseSize
      }
      
      performanceMonitor.recordAPIMetric(errorMetric)
      
      throw error
    }

    // Record successful metrics
    const endTime = Date.now()
    const successMetric: any = {
      endpoint,
      method: req.method || 'UNKNOWN',
      statusCode: res.statusCode,
      responseTime: endTime - startTime,
      timestamp: new Date(),
      userId: (req as any).user?.id
    }
    
    if (trackRequestSize) {
      successMetric.requestSize = requestSize
    }
    if (trackResponseSize) {
      successMetric.responseSize = responseSize
    }
    
    performanceMonitor.recordAPIMetric(successMetric)
  }
}

// Middleware for tracking specific operations
export function trackOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  return performanceMonitor.measureAsyncFunction(operationName, async () => {
    const result = await operation()
    
    // Track the operation as an event
    performanceMonitor.trackEvent(`operation_${operationName}`, {
      ...metadata,
      success: true,
      timestamp: new Date().toISOString()
    })
    
    return result
  })
}

// Track database operations
export function trackDatabaseOperation<T>(
  operation: string,
  collection: string,
  fn: () => Promise<T>
): Promise<T> {
  return trackOperation(`db_${operation}_${collection}`, fn, {
    operation,
    collection,
    type: 'database'
  })
}

// Track external API calls
export function trackExternalAPICall<T>(
  service: string,
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> {
  return trackOperation(`external_api_${service}`, fn, {
    service,
    endpoint,
    type: 'external_api'
  })
}