import { NextApiRequest, NextApiResponse } from 'next'
import { withAPIPerformanceTracking } from '@/lib/api-performance-middleware'
import { connectToDatabase } from '@/lib/mongodb'

interface DashboardMetrics {
  webVitals: {
    lcp: { average: number; p95: number; samples: number }
    fid: { average: number; p95: number; samples: number }
    cls: { average: number; p95: number; samples: number }
    fcp: { average: number; p95: number; samples: number }
    ttfb: { average: number; p95: number; samples: number }
  }
  apiPerformance: {
    averageResponseTime: number
    p95ResponseTime: number
    errorRate: number
    totalRequests: number
    slowestEndpoints: Array<{ endpoint: string; averageTime: number; count: number }>
  }
  userBehavior: {
    totalSessions: number
    averageSessionDuration: number
    topPages: Array<{ page: string; views: number }>
    topEvents: Array<{ event: string; count: number }>
  }
  systemHealth: {
    memoryUsage: { average: number; peak: number }
    errorCount: number
    alertCount: number
  }
}

async function calculatePercentile(values: number[], percentile: number): Promise<number> {
  if (values.length === 0) return 0
  
  const sorted = values.sort((a: number, b: number) => a - b)
  const index = Math.ceil((percentile / 100) * sorted.length) - 1
  return sorted[Math.max(0, index)] || 0
}

async function getWebVitalsMetrics(db: any, timeRange: Date): Promise<DashboardMetrics['webVitals']> {
  const webVitalMetrics = await db.collection('analytics').find({
    type: 'performance_metric',
    'data.tags.type': 'web-vital',
    timestamp: { $gte: timeRange }
  }).toArray()

  const vitals = {
    lcp: [] as number[],
    fid: [] as number[],
    cls: [] as number[],
    fcp: [] as number[],
    ttfb: [] as number[]
  }

  webVitalMetrics.forEach((metric: any) => {
    const name = metric.data.name?.toLowerCase()
    if (name && vitals[name as keyof typeof vitals]) {
      vitals[name as keyof typeof vitals].push(metric.data.value)
    }
  })

  return {
    lcp: {
      average: vitals.lcp.length > 0 ? vitals.lcp.reduce((a: number, b: number) => a + b, 0) / vitals.lcp.length : 0,
      p95: await calculatePercentile(vitals.lcp, 95),
      samples: vitals.lcp.length
    },
    fid: {
      average: vitals.fid.length > 0 ? vitals.fid.reduce((a: number, b: number) => a + b, 0) / vitals.fid.length : 0,
      p95: await calculatePercentile(vitals.fid, 95),
      samples: vitals.fid.length
    },
    cls: {
      average: vitals.cls.length > 0 ? vitals.cls.reduce((a: number, b: number) => a + b, 0) / vitals.cls.length : 0,
      p95: await calculatePercentile(vitals.cls, 95),
      samples: vitals.cls.length
    },
    fcp: {
      average: vitals.fcp.length > 0 ? vitals.fcp.reduce((a: number, b: number) => a + b, 0) / vitals.fcp.length : 0,
      p95: await calculatePercentile(vitals.fcp, 95),
      samples: vitals.fcp.length
    },
    ttfb: {
      average: vitals.ttfb.length > 0 ? vitals.ttfb.reduce((a: number, b: number) => a + b, 0) / vitals.ttfb.length : 0,
      p95: await calculatePercentile(vitals.ttfb, 95),
      samples: vitals.ttfb.length
    }
  }
}

async function getAPIPerformanceMetrics(db: any, timeRange: Date): Promise<DashboardMetrics['apiPerformance']> {
  const apiMetrics = await db.collection('analytics').find({
    type: 'api_metric',
    timestamp: { $gte: timeRange }
  }).toArray()

  const responseTimes = apiMetrics.map((m: any) => m.data.responseTime).filter((rt: number) => rt > 0)
  const errorCount = apiMetrics.filter((m: any) => m.data.statusCode >= 400).length
  
  // Get slowest endpoints
  const endpointStats = new Map<string, { times: number[]; count: number }>()
  apiMetrics.forEach((metric: any) => {
    const endpoint = metric.data.endpoint
    if (!endpointStats.has(endpoint)) {
      endpointStats.set(endpoint, { times: [], count: 0 })
    }
    const stats = endpointStats.get(endpoint)!
    stats.times.push(metric.data.responseTime)
    stats.count++
  })

  const slowestEndpoints = Array.from(endpointStats.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      averageTime: stats.times.reduce((a: number, b: number) => a + b, 0) / stats.times.length,
      count: stats.count
    }))
    .sort((a, b) => b.averageTime - a.averageTime)
    .slice(0, 5)

  return {
    averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
    p95ResponseTime: await calculatePercentile(responseTimes, 95),
    errorRate: apiMetrics.length > 0 ? (errorCount / apiMetrics.length) * 100 : 0,
    totalRequests: apiMetrics.length,
    slowestEndpoints
  }
}

async function getUserBehaviorMetrics(db: any, timeRange: Date): Promise<DashboardMetrics['userBehavior']> {
  const userEvents = await db.collection('analytics').find({
    type: 'user_event',
    timestamp: { $gte: timeRange }
  }).toArray()

  // Calculate unique sessions
  const uniqueSessions = new Set(userEvents.map((e: any) => e.sessionId)).size

  // Calculate top pages
  const pageViews = new Map<string, number>()
  userEvents.forEach((event: any) => {
    if (event.page) {
      pageViews.set(event.page, (pageViews.get(event.page) || 0) + 1)
    }
  })

  const topPages = Array.from(pageViews.entries())
    .map(([page, views]) => ({ page, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)

  // Calculate top events
  const eventCounts = new Map<string, number>()
  userEvents.forEach((event: any) => {
    const eventName = event.data.event
    if (eventName) {
      eventCounts.set(eventName, (eventCounts.get(eventName) || 0) + 1)
    }
  })

  const topEvents = Array.from(eventCounts.entries())
    .map(([event, count]) => ({ event, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)

  return {
    totalSessions: uniqueSessions,
    averageSessionDuration: 0, // Would need session start/end tracking
    topPages,
    topEvents
  }
}

async function getSystemHealthMetrics(db: any, timeRange: Date): Promise<DashboardMetrics['systemHealth']> {
  const memoryMetrics = await db.collection('analytics').find({
    type: 'performance_metric',
    'data.name': 'MEMORY_USED',
    timestamp: { $gte: timeRange }
  }).toArray()

  const memoryValues = memoryMetrics.map((m: any) => m.data.value)
  
  const errorMetrics = await db.collection('analytics').find({
    type: 'api_metric',
    'data.statusCode': { $gte: 500 },
    timestamp: { $gte: timeRange }
  }).toArray()

  return {
    memoryUsage: {
      average: memoryValues.length > 0 ? memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length : 0,
      peak: memoryValues.length > 0 ? Math.max(...memoryValues) : 0
    },
    errorCount: errorMetrics.length,
    alertCount: 0 // Would track from alert system
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { timeRange = '24h' } = req.query
    
    // Calculate time range
    const now = new Date()
    let startTime: Date
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000)
        break
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    }

    const { db } = await connectToDatabase()

    // Gather all metrics
    const [webVitals, apiPerformance, userBehavior, systemHealth] = await Promise.all([
      getWebVitalsMetrics(db, startTime),
      getAPIPerformanceMetrics(db, startTime),
      getUserBehaviorMetrics(db, startTime),
      getSystemHealthMetrics(db, startTime)
    ])

    const dashboardMetrics: DashboardMetrics = {
      webVitals,
      apiPerformance,
      userBehavior,
      systemHealth
    }

    res.status(200).json(dashboardMetrics)
  } catch (error) {
    console.error('Dashboard API error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

export default withAPIPerformanceTracking(handler, {
  excludeEndpoints: ['/api/analytics'],
  sampleRate: 0.1
})