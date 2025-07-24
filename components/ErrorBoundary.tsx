'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { ErrorType, ErrorHandler, AppError } from '../lib/error-handler'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level?: 'page' | 'component' | 'feature'
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string | null
  retryCount: number
}

export class ErrorBoundary extends Component<Props, State> {
  private errorHandler: ErrorHandler

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      retryCount: 0
    }
    this.errorHandler = ErrorHandler.getInstance()
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const context = {
      timestamp: new Date(),
      stack: error.stack,
      metadata: {
        componentStack: errorInfo.componentStack,
        level: this.props.level || 'component',
        retryCount: this.state.retryCount,
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined
      }
    }

    const errorResponse = this.errorHandler.handle(error, context)
    
    this.setState({
      errorId: errorResponse.requestId
    })

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 React Error Boundary')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Context:', context)
      console.groupEnd()
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorId: null,
      retryCount: prevState.retryCount + 1
    }))
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI based on level
      return (
        <ErrorFallback
          error={this.state.error}
          errorId={this.state.errorId}
          level={this.props.level || 'component'}
          retryCount={this.state.retryCount}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  errorId: string | null
  level: 'page' | 'component' | 'feature'
  retryCount: number
  onRetry: () => void
  onReload: () => void
}

function ErrorFallback({ 
  error, 
  errorId, 
  level, 
  retryCount, 
  onRetry, 
  onReload 
}: ErrorFallbackProps) {
  const isPageLevel = level === 'page'
  const canRetry = retryCount < 3
  
  return (
    <div className={`
      flex flex-col items-center justify-center p-6 
      ${isPageLevel ? 'min-h-screen bg-gray-50' : 'min-h-[200px] bg-gray-100 rounded-lg'}
    `}>
      <div className="text-center max-w-md">
        {/* Error Icon */}
        <div className="mb-4">
          <svg 
            className="mx-auto h-12 w-12 text-red-500" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>

        {/* Error Title */}
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          {isPageLevel ? 'Something went wrong' : 'Component Error'}
        </h2>

        {/* Error Message */}
        <p className="text-sm text-gray-600 mb-4">
          {isPageLevel 
            ? 'We encountered an unexpected error. Please try again or reload the page.'
            : 'This component failed to load properly.'
          }
        </p>

        {/* Error Details in Development */}
        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-4 text-left">
            <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
              Error Details
            </summary>
            <div className="bg-gray-800 text-green-400 p-3 rounded text-xs font-mono overflow-auto max-h-32">
              <div className="mb-2">
                <strong>Message:</strong> {error.message}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                </div>
              )}
            </div>
          </details>
        )}

        {/* Error ID */}
        {errorId && (
          <p className="text-xs text-gray-500 mb-4">
            Error ID: {errorId}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          {canRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Try Again {retryCount > 0 && `(${retryCount}/3)`}
            </button>
          )}
          
          {isPageLevel && (
            <button
              onClick={onReload}
              className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Reload Page
            </button>
          )}
        </div>

        {/* Help Text */}
        {!canRetry && (
          <p className="text-xs text-gray-500 mt-4">
            If this problem persists, please contact support with the error ID above.
          </p>
        )}
      </div>
    </div>
  )
}

// Specialized error boundaries for different use cases
export function PageErrorBoundary({ children, onError }: { 
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void 
}) {
  return (
    <ErrorBoundary level="page" onError={onError}>
      {children}
    </ErrorBoundary>
  )
}

export function ComponentErrorBoundary({ 
  children, 
  fallback,
  onError 
}: { 
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void 
}) {
  return (
    <ErrorBoundary level="component" fallback={fallback} onError={onError}>
      {children}
    </ErrorBoundary>
  )
}

export function FeatureErrorBoundary({ 
  children, 
  onError 
}: { 
  children: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void 
}) {
  return (
    <ErrorBoundary level="feature" onError={onError}>
      {children}
    </ErrorBoundary>
  )
}