'use client';

import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import Providers from '../components/Providers';
import { PageErrorBoundary } from '../components/ErrorBoundary';
import { PerformanceDashboard } from '../components/PerformanceDashboard';
import { useEffect } from 'react';

const inter = Inter({ subsets: ['latin'] });

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize performance monitoring in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      import('../lib/performance-init')
        .then(module => module.initPerformanceMonitoring())
        .catch(error => console.error('Failed to initialize performance monitoring:', error));
    }
  }, []);

  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased`}>
        <PageErrorBoundary>
          <Providers session={null}>
            {children}
          </Providers>
        </PageErrorBoundary>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid #334155',
            },
          }}
        />
        {process.env.NODE_ENV === 'development' && <PerformanceDashboard />}
      </body>
    </html>
  );
}
