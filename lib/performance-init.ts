// Performance monitoring initialization service
import { performanceMonitor } from './performance-monitor'
import { realTimeMonitor } from './real-time-monitor'

export class PerformanceInit {
  private static initialized = false

  public static initialize(): void {
    if (this.initialized || typeof window === 'undefined') return

    try {
      // Initialize performance monitoring
      console.log('Initializing performance monitoring...')
      
      // Track page load event
      performanceMonitor.trackEvent('page_load', {
        url: window.location.href,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      })

      // Track user interactions
      this.setupUserInteractionTracking()
      
      // Track navigation events
      this.setupNavigationTracking()
      
      // Track errors
      this.setupErrorTracking()
      
      // Start real-time monitoring in development
      if (process.env.NODE_ENV === 'development') {
        realTimeMonitor.startMonitoring(10000) // Every 10 seconds in dev
      }

      this.initialized = true
      console.log('Performance monitoring initialized successfully')
    } catch (error) {
      console.error('Failed to initialize performance monitoring:', error)
    }
  }

  private static setupUserInteractionTracking(): void {
    // Track clicks
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      if (target) {
        performanceMonitor.trackEvent('user_click', {
          element: target.tagName.toLowerCase(),
          className: target.className,
          id: target.id,
          text: target.textContent?.substring(0, 100) || '',
          timestamp: new Date().toISOString()
        })
      }
    })

    // Track form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement
      if (form) {
        performanceMonitor.trackEvent('form_submit', {
          formId: form.id,
          formName: form.name,
          action: form.action,
          method: form.method,
          timestamp: new Date().toISOString()
        })
      }
    })

    // Track input focus (for engagement tracking)
    document.addEventListener('focusin', (event) => {
      const target = event.target as HTMLElement
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        performanceMonitor.trackEvent('input_focus', {
          inputType: (target as HTMLInputElement).type || 'textarea',
          inputName: (target as HTMLInputElement).name,
          timestamp: new Date().toISOString()
        })
      }
    })
  }

  private static setupNavigationTracking(): void {
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      performanceMonitor.trackEvent('page_visibility_change', {
        hidden: document.hidden,
        visibilityState: document.visibilityState,
        timestamp: new Date().toISOString()
      })
    })

    // Track page unload
    window.addEventListener('beforeunload', () => {
      performanceMonitor.trackEvent('page_unload', {
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    })

    // Track hash changes (for SPA navigation)
    window.addEventListener('hashchange', () => {
      performanceMonitor.trackEvent('hash_change', {
        oldURL: window.location.href,
        newURL: window.location.href,
        timestamp: new Date().toISOString()
      })
    })
  }

  private static setupErrorTracking(): void {
    // Track JavaScript errors
    window.addEventListener('error', (event) => {
      performanceMonitor.trackEvent('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      })
    })

    // Track unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      performanceMonitor.trackEvent('unhandled_promise_rejection', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      })
    })

    // Track resource loading errors
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        const target = event.target as HTMLElement
        performanceMonitor.trackEvent('resource_error', {
          tagName: target.tagName,
          src: (target as any).src || (target as any).href,
          timestamp: new Date().toISOString()
        })
      }
    }, true)
  }

  public static trackCustomEvent(eventName: string, properties?: Record<string, unknown>): void {
    performanceMonitor.trackEvent(eventName, {
      ...properties,
      timestamp: new Date().toISOString()
    })
  }

  public static recordCustomMetric(name: string, value: number, unit: 'ms' | 'bytes' | 'count' | 'percentage' = 'count'): void {
    performanceMonitor.recordMetric({
      name,
      value,
      unit,
      timestamp: new Date(),
      tags: { type: 'custom' }
    })
  }
}

// Auto-initialize when module is loaded in browser
if (typeof window !== 'undefined') {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      PerformanceInit.initialize()
    })
  } else {
    PerformanceInit.initialize()
  }
}

// Export the initialization function
export function initPerformanceMonitoring(): void {
  PerformanceInit.initialize()
}

export default PerformanceInit