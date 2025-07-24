// Performance monitoring initialization
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Enable web vitals reporting in development
  const reportWebVitals = (onPerfEntry?: any) => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(onPerfEntry);
        getFID(onPerfEntry);
        getFCP(onPerfEntry);
        getLCP(onPerfEntry);
        getTTFB(onPerfEntry);
      });
    }
  };

  // Log performance metrics to console in development
  reportWebVitals((metric: any) => {
    console.log(metric);
  });
}

// Export a no-op function for production
export default function initPerformanceMonitoring() {
  // No-op in production unless explicitly enabled
  if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_ENABLE_PERF_MONITORING === 'true') {
    // Performance monitoring can be initialized here
  }
}
