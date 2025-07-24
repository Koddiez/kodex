import { NextApiRequest, NextApiResponse } from 'next'
import { withAPIPerformanceTracking } from '../../../lib/api-performance-middleware'
import { connectToDatabase } from '../../../lib/mongodb'

interface AnalyticsPayload {
  type: 'performance_metric' | 'user_event' | 'api_metric' | 'system_health'
  data: any
  sessionId?: string
  userId?: string
  timestamp?: string
  userAgent?: string
  page?: string
}

interface StoredAnalyticsData {
  type: string
  data: any
  sessionId?: string
  userId?: string
  timestamp: Date
  userAgent?: string
  page?: string
  ip?: string
  createdAt: Date
}

async function storeAnalyticsData(payload: AnalyticsPayload, req: NextApiRequest): Promise<void> {
  try {
    const { db } = await connectToDatabase()
    
    const analyticsData: StoredAnalyticsData = {
      type: payload.type,
      data: payload.data,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      createdAt: new Date(),
      ...(payload.sessionId && { sessionId: payload.sessionId }),
      ...(payload.userId && { userId: payload.userId }),
      ...(payload.userAgent && { userAgent: payload.userAgent }),
      ...(req.headers['user-agent'] && { userAgent: req.headers['user-agent'] as string }),
      ...(payload.page && { page: payload.page }),
      ...(req.headers['x-forwarded-for'] && { ip: req.headers['x-forwarded-for'] as string }),
      ...(!req.headers['x-forwarded-for'] && req.socket.remoteAddress && { ip: req.socket.remoteAddress })
    }

    await db.collection('analytics').insertOne(analyticsData)
    
    // Create indexes for better query performance
    await db.collection('analytics').createIndex({ type: 1, timestamp: -1 })
    await db.collection('analytics').createIndex({ sessionId: 1 })
    await db.collection('analytics').createIndex({ userId: 1 })
    await db.collection('analytics').createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }) // 30 days TTL
    
  } catch (error) {
    console.error('Failed to store analytics data:', error)
    // Don't throw error to avoid breaking the analytics flow
  }
}

async function processRealTimeAlerts(payload: AnalyticsPayload): Promise<void> {
  // Process performance metrics for real-time alerting
  if (payload.type === 'performance_metric' && payload.data) {
    const { name, value, unit } = payload.data
    
    // Define alert thresholds
    const alertThresholds: Record<string, { threshold: number; unit: string }> = {
      'LCP': { threshold: 4000, unit: 'ms' },
      'FID': { threshold: 300, unit: 'ms' },
      'CLS': { threshold: 0.25, unit: 'count' },
      'TTFB': { threshold: 1800, unit: 'ms' }
    }
    
    const threshold = alertThresholds[name]
    if (threshold && unit === threshold.unit && value > threshold.threshold) {
      console.warn(`[PERFORMANCE ALERT] ${name} exceeded threshold: ${value}${unit} > ${threshold.threshold}${threshold.unit}`)
      
      // In production, you would send alerts to monitoring services
      // await sendAlert({
      //   metric: name,
      //   value,
      //   threshold: threshold.threshold,
      //   severity: 'warning'
      // })
    }
  }
  
  // Process API metrics for error rate monitoring
  if (payload.type === 'api_metric' && payload.data) {
    const { statusCode, responseTime, endpoint } = payload.data
    
    if (statusCode >= 500) {
      console.error(`[API ERROR] ${endpoint}: ${statusCode} - Response time: ${responseTime}ms`)
    } else if (responseTime > 5000) {
      console.warn(`[SLOW API] ${endpoint}: ${responseTime}ms`)
    }
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const payload: AnalyticsPayload = req.body

    // Validate payload
    if (!payload.type || !payload.data) {
      return res.status(400).json({ error: 'Invalid payload' })
    }

    // Enhanced logging with more context
    console.log(`[ANALYTICS] ${payload.type}:`, {
      sessionId: payload.sessionId,
      userId: payload.userId,
      timestamp: payload.timestamp || new Date().toISOString(),
      page: payload.page,
      userAgent: req.headers['user-agent'],
      data: payload.data
    })

    // Store in database
    await storeAnalyticsData(payload, req)

    // Process real-time alerts
    await processRealTimeAlerts(payload)

    // Send to external analytics service in production
    if (process.env.NODE_ENV === 'production') {
      // await sendToExternalAnalytics(payload)
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Analytics API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAPIPerformanceTracking(handler, {
  excludeEndpoints: ['/api/analytics'], // Don't track analytics endpoints to avoid recursion
  sampleRate: 0.1 // Sample only 10% of analytics requests
})