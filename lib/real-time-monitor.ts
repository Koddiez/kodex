// Real-time performance monitoring service
export interface SystemHealthMetrics {
  cpu: number
  memory: number
  responseTime: number
  errorRate: number
  activeUsers: number
  timestamp: Date
}

export interface AlertThreshold {
  metric: 'cpu' | 'memory' | 'responseTime' | 'errorRate' | 'activeUsers'
  threshold: number
  operator: 'gt' | 'lt' | 'eq'
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface PerformanceAlert {
  id: string
  metric: string
  value: number
  threshold: number
  severity: string
  message: string
  timestamp: Date
  resolved: boolean
}

export class RealTimeMonitor {
  private static instance: RealTimeMonitor
  private alerts: PerformanceAlert[] = []
  private thresholds: AlertThreshold[] = [
    { metric: 'responseTime', threshold: 1000, operator: 'gt', severity: 'medium' },
    { metric: 'errorRate', threshold: 5, operator: 'gt', severity: 'high' },
    { metric: 'memory', threshold: 80, operator: 'gt', severity: 'medium' },
    { metric: 'cpu', threshold: 90, operator: 'gt', severity: 'critical' }
  ]
  private subscribers: ((metrics: SystemHealthMetrics) => void)[] = []
  private alertSubscribers: ((alert: PerformanceAlert) => void)[] = []
  private monitoringInterval: NodeJS.Timeout | null = null
  private isMonitoring = false

  public static getInstance(): RealTimeMonitor {
    if (!RealTimeMonitor.instance) {
      RealTimeMonitor.instance = new RealTimeMonitor()
    }
    return RealTimeMonitor.instance
  }

  public startMonitoring(intervalMs: number = 5000): void {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics()
    }, intervalMs)

    console.log('Real-time performance monitoring started')
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    this.isMonitoring = false
    console.log('Real-time performance monitoring stopped')
  }

  public subscribe(callback: (metrics: SystemHealthMetrics) => void): () => void {
    this.subscribers.push(callback)
    return () => {
      const index = this.subscribers.indexOf(callback)
      if (index > -1) {
        this.subscribers.splice(index, 1)
      }
    }
  }

  public subscribeToAlerts(callback: (alert: PerformanceAlert) => void): () => void {
    this.alertSubscribers.push(callback)
    return () => {
      const index = this.alertSubscribers.indexOf(callback)
      if (index > -1) {
        this.alertSubscribers.splice(index, 1)
      }
    }
  }

  public addThreshold(threshold: AlertThreshold): void {
    this.thresholds.push(threshold)
  }

  public removeThreshold(metric: keyof SystemHealthMetrics): void {
    this.thresholds = this.thresholds.filter(t => t.metric !== metric)
  }

  public getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved)
  }

  public resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.resolved = true
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      const metrics = await this.gatherSystemMetrics()
      
      // Check thresholds and generate alerts
      this.checkThresholds(metrics)
      
      // Notify subscribers
      this.subscribers.forEach(callback => {
        try {
          callback(metrics)
        } catch (error) {
          console.error('Error in metrics subscriber:', error)
        }
      })
    } catch (error) {
      console.error('Error collecting metrics:', error)
    }
  }

  private async gatherSystemMetrics(): Promise<SystemHealthMetrics> {
    // In a real implementation, you would gather actual system metrics
    // For now, we'll simulate some metrics and gather what we can from the browser
    
    let memory = 0
    let responseTime = 0
    
    if (typeof window !== 'undefined') {
      // Browser environment - get memory info if available
      if ('memory' in performance) {
        const memInfo = (performance as any).memory
        memory = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100
      }
      
      // Measure a simple response time
      const start = performance.now()
      await new Promise(resolve => setTimeout(resolve, 1))
      responseTime = performance.now() - start
    } else {
      // Node.js environment - get process memory
      const memUsage = process.memoryUsage()
      memory = (memUsage.heapUsed / memUsage.heapTotal) * 100
      
      // Simple response time simulation
      responseTime = Math.random() * 100 + 50
    }

    return {
      cpu: Math.random() * 100, // Simulated - would use actual CPU monitoring
      memory,
      responseTime,
      errorRate: Math.random() * 10, // Simulated - would calculate from actual error logs
      activeUsers: Math.floor(Math.random() * 100), // Simulated - would get from session store
      timestamp: new Date()
    }
  }

  private checkThresholds(metrics: SystemHealthMetrics): void {
    this.thresholds.forEach(threshold => {
      const value = metrics[threshold.metric]
      let shouldAlert = false

      switch (threshold.operator) {
        case 'gt':
          shouldAlert = value > threshold.threshold
          break
        case 'lt':
          shouldAlert = value < threshold.threshold
          break
        case 'eq':
          shouldAlert = value === threshold.threshold
          break
      }

      if (shouldAlert) {
        // Check if we already have an active alert for this metric
        const existingAlert = this.alerts.find(
          alert => alert.metric === threshold.metric && !alert.resolved
        )

        if (!existingAlert) {
          const alert: PerformanceAlert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
            metric: threshold.metric,
            value,
            threshold: threshold.threshold,
            severity: threshold.severity,
            message: this.generateAlertMessage(threshold.metric, value, threshold.threshold, threshold.operator),
            timestamp: new Date(),
            resolved: false
          }

          this.alerts.push(alert)
          
          // Notify alert subscribers
          this.alertSubscribers.forEach(callback => {
            try {
              callback(alert)
            } catch (error) {
              console.error('Error in alert subscriber:', error)
            }
          })

          console.warn(`[PERFORMANCE ALERT] ${alert.message}`)
        }
      }
    })
  }

  private generateAlertMessage(
    metric: string,
    value: number,
    threshold: number,
    operator: string
  ): string {
    const operatorText = {
      gt: 'exceeded',
      lt: 'below',
      eq: 'equals'
    }[operator] || 'triggered'

    const unit = {
      responseTime: 'ms',
      errorRate: '%',
      memory: '%',
      cpu: '%',
      activeUsers: ''
    }[metric] || ''

    return `${metric} ${operatorText} threshold: ${value.toFixed(2)}${unit} (threshold: ${threshold}${unit})`
  }

  public getMetricsHistory(timeRangeMinutes: number = 60): SystemHealthMetrics[] {
    // In a real implementation, this would query a time-series database
    // For now, return empty array as we don't store historical data
    console.log(`Getting metrics history for ${timeRangeMinutes} minutes`)
    return []
  }

  public exportMetrics(): {
    alerts: PerformanceAlert[]
    thresholds: AlertThreshold[]
    isMonitoring: boolean
  } {
    return {
      alerts: this.alerts,
      thresholds: this.thresholds,
      isMonitoring: this.isMonitoring
    }
  }
}

// Export singleton instance
export const realTimeMonitor = RealTimeMonitor.getInstance()

// Convenience functions
export const startPerformanceMonitoring = (intervalMs?: number) => {
  realTimeMonitor.startMonitoring(intervalMs)
}

export const stopPerformanceMonitoring = () => {
  realTimeMonitor.stopMonitoring()
}

export const subscribeToMetrics = (callback: (metrics: SystemHealthMetrics) => void) => {
  return realTimeMonitor.subscribe(callback)
}

export const subscribeToAlerts = (callback: (alert: PerformanceAlert) => void) => {
  return realTimeMonitor.subscribeToAlerts(callback)
}