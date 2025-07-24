'use client';

import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';
import { SocketProvider } from '@/lib/socket-context';
import { AIProvider } from '@/lib/ai-context';

type ProvidersProps = {
  children: ReactNode;
  session: Session | null;
};

export function Providers({ children, session }: ProvidersProps) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <SocketProvider>
          <AIProvider>
            {children}
          </AIProvider>
        </SocketProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

export default Providers;
