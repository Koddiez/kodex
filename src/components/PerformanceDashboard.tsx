'use client';

import { useEffect, useState } from 'react';

type Metric = {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
};

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development or when explicitly enabled
    const shouldShow = process.env.NODE_ENV === 'development' || 
                     process.env.NEXT_PUBLIC_PERF_DASHBOARD === 'true';
    
    if (!shouldShow) return;

    const handleWebVitals = (metric: any) => {
      setMetrics(prev => {
        const existingIndex = prev.findIndex(m => m.name === metric.name);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = {
            name: metric.name,
            value: parseFloat(metric.value.toFixed(2)),
            rating: metric.rating || 'good',
          };
          return updated;
        }
        return [
          ...prev,
          {
            name: metric.name,
            value: parseFloat(metric.value.toFixed(2)),
            rating: metric.rating || 'good',
          },
        ];
      });
    };

    // Only import web-vitals in the browser
    if (typeof window !== 'undefined') {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(handleWebVitals);
        getFID(handleWebVitals);
        getFCP(handleWebVitals);
        getLCP(handleWebVitals);
        getTTFB(handleWebVitals);
      });
    }

    // Show the dashboard after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible || metrics.length === 0) return null;

  const getColor = (rating: string) => {
    switch (rating) {
      case 'good':
        return 'bg-green-100 text-green-800';
      case 'needs-improvement':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-64">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-bold text-sm">Performance Metrics</h3>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Close performance dashboard"
          >
            ×
          </button>
        </div>
        <div className="space-y-2">
          {metrics.map((metric) => (
            <div key={metric.name} className="text-xs">
              <div className="flex justify-between">
                <span className="font-medium">{metric.name}:</span>
                <span className="font-mono">{metric.value} ms</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div
                  className={`h-1.5 rounded-full ${getColor(metric.rating)}`}
                  style={{
                    width: `${Math.min(metric.value / 5, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PerformanceDashboard;
