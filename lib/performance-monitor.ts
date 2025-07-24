// Performance monitoring and analytics system
export interface PerformanceMetric {
  name: string
  value: number
  unit: 'ms' | 'bytes' | 'count' | 'percentage'
  timestamp: Date
  tags?: Record<string, string>
  metadata?: Record<string, unknown>
}

export interface UserBehaviorEvent {
  event: string
  userId?: string
  sessionId: string
  timestamp: Date
  properties?: Record<string, unknown>
  page?: string
  userAgent?: string
}

export interface APIPerformanceMetric {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  timestamp: Date
  userId?: string
  errorMessage?: string
  requestSize?: number
  responseSize?: number
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: PerformanceMetric[] = []
  private userEvents: UserBehaviorEvent[] = []
  private apiMetrics: APIPerformanceMetric[] = []
  private sessionId: string
  private isEnabled: boolean = true

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeWebVitals()
    this.initializeNavigationTiming()
    this.initializeResourceTiming()
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  // Web Vitals monitoring
  private initializeWebVitals(): void {
    if (typeof window === 'undefined') return

    // Core Web Vitals
    this.observeWebVital('LCP', this.getLCP.bind(this))
    this.observeWebVital('FID', this.getFID.bind(this))
    this.observeWebVital('CLS', this.getCLS.bind(this))
    
    // Additional metrics
    this.observeWebVital('FCP', this.getFCP.bind(this))
    this.observeWebVital('TTFB', this.getTTFB.bind(this))
  }

  private observeWebVital(name: string, callback: () => void): void {
    if ('PerformanceObserver' in window) {
      try {
        callback()
      } catch (error) {
        console.warn(`Failed to observe ${name}:`, error)
      }
    }
  }

  // Largest Contentful Paint
  private getLCP(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any
      
      this.recordMetric({
        name: 'LCP',
        value: lastEntry.startTime,
        unit: 'ms',
        timestamp: new Date(),
        tags: { type: 'web-vital' }
      })
    })
    
    observer.observe({ entryTypes: ['largest-contentful-paint'] })
  }

  // First Input Delay
  private getFID(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        this.recordMetric({
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          unit: 'ms',
          timestamp: new Date(),
          tags: { type: 'web-vital' }
        })
      })
    })
    
    observer.observe({ entryTypes: ['first-input'] })
  }

  // Cumulative Layout Shift
  private getCLS(): void {
    let clsValue = 0
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      })
      
      this.recordMetric({
        name: 'CLS',
        value: clsValue,
        unit: 'count',
        timestamp: new Date(),
        tags: { type: 'web-vital' }
      })
    })
    
    observer.observe({ entryTypes: ['layout-shift'] })
  }

  // First Contentful Paint
  private getFCP(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        this.recordMetric({
          name: 'FCP',
          value: entry.startTime,
          unit: 'ms',
          timestamp: new Date(),
          tags: { type: 'web-vital' }
        })
      })
    })
    
    observer.observe({ entryTypes: ['paint'] })
  }

  // Time to First Byte
  private getTTFB(): void {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as any
      if (navigation) {
        this.recordMetric({
          name: 'TTFB',
          value: navigation.responseStart - navigation.requestStart,
          unit: 'ms',
          timestamp: new Date(),
          tags: { type: 'web-vital' }
        })
      }
    }
  }

  // Navigation timing
  private initializeNavigationTiming(): void {
    if (typeof window === 'undefined') return

    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as any
        if (navigation) {
          this.recordMetric({
            name: 'DOM_CONTENT_LOADED',
            value: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            unit: 'ms',
            timestamp: new Date(),
            tags: { type: 'navigation' }
          })

          this.recordMetric({
            name: 'LOAD_EVENT',
            value: navigation.loadEventEnd - navigation.loadEventStart,
            unit: 'ms',
            timestamp: new Date(),
            tags: { type: 'navigation' }
          })

          this.recordMetric({
            name: 'TOTAL_LOAD_TIME',
            value: navigation.loadEventEnd - navigation.fetchStart,
            unit: 'ms',
            timestamp: new Date(),
            tags: { type: 'navigation' }
          })
        }
      }, 0)
    })
  }

  // Resource timing
  private initializeResourceTiming(): void {
    if (typeof window === 'undefined') return

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry: any) => {
        if (entry.initiatorType) {
          this.recordMetric({
            name: 'RESOURCE_LOAD_TIME',
            value: entry.responseEnd - entry.startTime,
            unit: 'ms',
            timestamp: new Date(),
            tags: {
              type: 'resource',
              resourceType: entry.initiatorType,
              resourceName: entry.name
            },
            metadata: {
              transferSize: entry.transferSize,
              encodedBodySize: entry.encodedBodySize,
              decodedBodySize: entry.decodedBodySize
            }
          })
        }
      })
    })

    observer.observe({ entryTypes: ['resource'] })
  }

  // Record custom metrics
  public recordMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return

    this.metrics.push(metric)
    
    // Send to analytics service if configured
    this.sendMetricToAnalytics(metric)
    
    // Keep only recent metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-500)
    }
  }

  // Track user behavior
  public trackEvent(event: string, properties?: Record<string, unknown>): void {
    if (!this.isEnabled) return

    const userEvent: UserBehaviorEvent = {
      event,
      sessionId: this.sessionId,
      timestamp: new Date(),
      ...(properties && { properties }),
      ...(typeof window !== 'undefined' && window.location.pathname && { page: window.location.pathname }),
      ...(typeof window !== 'undefined' && window.navigator.userAgent && { userAgent: window.navigator.userAgent })
    }

    this.userEvents.push(userEvent)
    this.sendEventToAnalytics(userEvent)

    // Keep only recent events in memory
    if (this.userEvents.length > 500) {
      this.userEvents = this.userEvents.slice(-250)
    }
  }

  // Track API performance
  public recordAPIMetric(metric: APIPerformanceMetric): void {
    if (!this.isEnabled) return

    this.apiMetrics.push(metric)
    this.sendAPIMetricToAnalytics(metric)

    // Keep only recent API metrics in memory
    if (this.apiMetrics.length > 500) {
      this.apiMetrics = this.apiMetrics.slice(-250)
    }
  }

  // Measure function execution time
  public measureFunction<T>(name: string, fn: () => T): T {
    const startTime = performance.now()
    const result = fn()
    const endTime = performance.now()

    this.recordMetric({
      name: `FUNCTION_${name.toUpperCase()}`,
      value: endTime - startTime,
      unit: 'ms',
      timestamp: new Date(),
      tags: { type: 'function-performance' }
    })

    return result
  }

  // Measure async function execution time
  public async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now()
    const result = await fn()
    const endTime = performance.now()

    this.recordMetric({
      name: `ASYNC_FUNCTION_${name.toUpperCase()}`,
      value: endTime - startTime,
      unit: 'ms',
      timestamp: new Date(),
      tags: { type: 'async-function-performance' }
    })

    return result
  }

  // Memory usage monitoring
  public recordMemoryUsage(): void {
    if (typeof window === 'undefined' || !('memory' in performance)) return

    const memory = (performance as any).memory
    
    this.recordMetric({
      name: 'MEMORY_USED',
      value: memory.usedJSHeapSize,
      unit: 'bytes',
      timestamp: new Date(),
      tags: { type: 'memory' }
    })

    this.recordMetric({
      name: 'MEMORY_TOTAL',
      value: memory.totalJSHeapSize,
      unit: 'bytes',
      timestamp: new Date(),
      tags: { type: 'memory' }
    })

    this.recordMetric({
      name: 'MEMORY_LIMIT',
      value: memory.jsHeapSizeLimit,
      unit: 'bytes',
      timestamp: new Date(),
      tags: { type: 'memory' }
    })
  }

  // Get performance summary
  public getPerformanceSummary(): {
    webVitals: Record<string, number>
    averageMetrics: Record<string, number>
    recentEvents: UserBehaviorEvent[]
    apiPerformance: {
      averageResponseTime: number
      errorRate: number
      totalRequests: number
    }
  } {
    const webVitals: Record<string, number> = {}
    const metricGroups: Record<string, number[]> = {}

    // Group metrics by name
    this.metrics.forEach(metric => {
      if (metric.tags?.type === 'web-vital') {
        webVitals[metric.name] = metric.value
      }
      
      if (!metricGroups[metric.name]) {
        metricGroups[metric.name] = []
      }
      metricGroups[metric.name]!.push(metric.value)
    })

    // Calculate averages
    const averageMetrics: Record<string, number> = {}
    Object.entries(metricGroups).forEach(([name, values]) => {
      averageMetrics[name] = values.reduce((sum, val) => sum + val, 0) / values.length
    })

    // API performance summary
    const totalRequests = this.apiMetrics.length
    const errorRequests = this.apiMetrics.filter(m => m.statusCode >= 400).length
    const totalResponseTime = this.apiMetrics.reduce((sum, m) => sum + m.responseTime, 0)

    return {
      webVitals,
      averageMetrics,
      recentEvents: this.userEvents.slice(-10),
      apiPerformance: {
        averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
        errorRate: totalRequests > 0 ? (errorRequests / totalRequests) * 100 : 0,
        totalRequests
      }
    }
  }

  // Send metrics to analytics service
  private sendMetricToAnalytics(metric: PerformanceMetric): void {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      // In production, send to your analytics service
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'performance_metric',
          data: metric,
          sessionId: this.sessionId
        })
      }).catch(error => {
        console.warn('Failed to send metric to analytics:', error)
      })
    }
  }

  private sendEventToAnalytics(event: UserBehaviorEvent): void {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user_event',
          data: event
        })
      }).catch(error => {
        console.warn('Failed to send event to analytics:', error)
      })
    }
  }

  private sendAPIMetricToAnalytics(metric: APIPerformanceMetric): void {
    if (process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'api_metric',
          data: metric
        })
      }).catch(error => {
        console.warn('Failed to send API metric to analytics:', error)
      })
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  }

  // Enable/disable monitoring
  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled
  }

  // Clear all stored metrics
  public clearMetrics(): void {
    this.metrics = []
    this.userEvents = []
    this.apiMetrics = []
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()

// Convenience functions
export const trackEvent = (event: string, properties?: Record<string, unknown>) => {
  performanceMonitor.trackEvent(event, properties)
}

export const recordMetric = (metric: PerformanceMetric) => {
  performanceMonitor.recordMetric(metric)
}

export const measureFunction = <T>(name: string, fn: () => T): T => {
  return performanceMonitor.measureFunction(name, fn)
}

export const measureAsyncFunction = <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  return performanceMonitor.measureAsyncFunction(name, fn)
}