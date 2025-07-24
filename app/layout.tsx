import type { Metadata } from 'next';
import ClientLayout from './ClientLayout';
import './globals.css';

export const metadata: Metadata = {
  title: 'Kodex - Next-Generation Full-Stack Development Platform',
  description: 'Build, deploy, and scale your web applications with AI-powered assistance. The ultimate platform for modern developers.',
  keywords: 'web development, full-stack, AI, coding, deployment, collaboration',
  authors: [{ name: 'Kodex Team' }],
  viewport: 'width=device-width, initial-scale=1',
  robots: 'index, follow',
  openGraph: {
    title: 'Kodex - Next-Generation Full-Stack Development Platform',
    description: 'Build, deploy, and scale your web applications with AI-powered assistance.',
    type: 'website',
    url: 'https://kodex.dev',
    siteName: 'Kodex',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kodex - Next-Generation Full-Stack Development Platform',
    description: 'Build, deploy, and scale your web applications with AI-powered assistance.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientLayout>{children}</ClientLayout>;
}