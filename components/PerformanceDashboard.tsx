'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { performanceMonitor } from '../lib/performance-monitor'
import { realTimeMonitor, SystemHealthMetrics, PerformanceAlert } from '../lib/real-time-monitor'

interface PerformanceStats {
  webVitals: Record<string, number>
  averageMetrics: Record<string, number>
  recentEvents: Array<{
    event: string
    timestamp: Date
    properties?: Record<string, unknown>
  }>
  apiPerformance: {
    averageResponseTime: number
    errorRate: number
    totalRequests: number
  }
}

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

export function PerformanceDashboard() {
  const [stats, setStats] = useState<PerformanceStats | null>(null)
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealthMetrics | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'api' | 'system'>('overview')
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)

  const fetchDashboardMetrics = useCallback(async () => {
    try {
      const response = await fetch(`/api/analytics/dashboard?timeRange=${timeRange}`)
      if (response.ok) {
        const metrics = await response.json()
        setDashboardMetrics(metrics)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard metrics:', error)
    }
  }, [timeRange])

  useEffect(() => {
    if (isVisible) {
      // Initial load
      updateStats()
      fetchDashboardMetrics()
      
      // Start real-time monitoring
      realTimeMonitor.startMonitoring(5000)
      
      // Subscribe to real-time metrics
      const unsubscribeMetrics = realTimeMonitor.subscribe((metrics) => {
        setSystemHealth(metrics)
      })
      
      // Subscribe to alerts
      const unsubscribeAlerts = realTimeMonitor.subscribeToAlerts((alert) => {
        setAlerts(prev => [alert, ...prev.slice(0, 9)]) // Keep last 10 alerts
      })
      
      // Set up auto-refresh
      const interval = setInterval(() => {
        updateStats()
        fetchDashboardMetrics()
      }, 30000) // Refresh every 30 seconds
      setRefreshInterval(interval)
      
      return () => {
        if (interval) clearInterval(interval)
        unsubscribeMetrics()
        unsubscribeAlerts()
        realTimeMonitor.stopMonitoring()
      }
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
      realTimeMonitor.stopMonitoring()
    }
  }, [isVisible, fetchDashboardMetrics])

  const updateStats = () => {
    try {
      const summary = performanceMonitor.getPerformanceSummary()
      setStats(summary)
    } catch (error) {
      console.error('Failed to get performance summary:', error)
    }
  }

  const formatMetricValue = (value: number, unit?: string): string => {
    if (unit === 'ms') {
      return `${Math.round(value)}ms`
    } else if (unit === 'bytes') {
      return formatBytes(value)
    } else if (unit === 'percentage') {
      return `${Math.round(value)}%`
    }
    return Math.round(value).toString()
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`
  }

  const getWebVitalStatus = (metric: string, value: number): 'good' | 'needs-improvement' | 'poor' => {
    const thresholds = {
      LCP: { good: 2500, poor: 4000 },
      FID: { good: 100, poor: 300 },
      CLS: { good: 0.1, poor: 0.25 },
      FCP: { good: 1800, poor: 3000 },
      TTFB: { good: 800, poor: 1800 }
    }

    const threshold = thresholds[metric as keyof typeof thresholds]
    if (!threshold) return 'good'

    if (value <= threshold.good) return 'good'
    if (value <= threshold.poor) return 'needs-improvement'
    return 'poor'
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-100'
      case 'needs-improvement': return 'text-yellow-600 bg-yellow-100'
      case 'poor': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="Show Performance Dashboard"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-96 max-h-96 overflow-y-auto">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Performance Monitor</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-gray-600 focus:outline-none"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Web Vitals */}
        {stats?.webVitals && Object.keys(stats.webVitals).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Core Web Vitals</h4>
            <div className="space-y-2">
              {Object.entries(stats.webVitals).map(([metric, value]) => {
                const status = getWebVitalStatus(metric, value)
                return (
                  <div key={metric} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{metric}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(status)}`}>
                      {formatMetricValue(value, 'ms')}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* API Performance */}
        {stats?.apiPerformance && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">API Performance</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Avg Response Time</span>
                <span className="text-sm font-medium">
                  {formatMetricValue(stats.apiPerformance.averageResponseTime, 'ms')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Error Rate</span>
                <span className={`text-sm font-medium ${
                  stats.apiPerformance.errorRate > 5 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {formatMetricValue(stats.apiPerformance.errorRate, 'percentage')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Requests</span>
                <span className="text-sm font-medium">
                  {stats.apiPerformance.totalRequests}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Recent Events */}
        {stats?.recentEvents && stats.recentEvents.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Activity</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {stats.recentEvents.slice(0, 5).map((event, index) => (
                <div key={index} className="text-xs text-gray-600 flex items-center justify-between">
                  <span className="truncate">{event.event}</span>
                  <span className="text-gray-400 ml-2">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Memory Usage */}
        <div>
          <button
            onClick={() => performanceMonitor.recordMemoryUsage()}
            className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700"
          >
            Record Memory Usage
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <button
            onClick={updateStats}
            className="text-xs bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded text-blue-700"
          >
            Refresh
          </button>
          <button
            onClick={() => {
              performanceMonitor.clearMetrics()
              updateStats()
            }}
            className="text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-red-700"
          >
            Clear Data
          </button>
        </div>
      </div>
    </div>
  )
}

// Hook for using performance monitoring in components
export function usePerformanceTracking() {
  const trackEvent = (event: string, properties?: Record<string, unknown>) => {
    performanceMonitor.trackEvent(event, properties)
  }

  const measureFunction = <T,>(name: string, fn: () => T): T => {
    return performanceMonitor.measureFunction(name, fn)
  }

  const measureAsyncFunction = <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
    return performanceMonitor.measureAsyncFunction(name, fn)
  }

  return {
    trackEvent,
    measureFunction,
    measureAsyncFunction
  }
}