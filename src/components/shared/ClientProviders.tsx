'use client';

import type { ReactNode } from 'react';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { NotificationProvider } from '@/contexts/NotificationContext';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 5000,
              style: {
                background: '#FFFFFF',
                color: '#2D2519',
                border: '1px solid #DDD3C5',
                borderRadius: '12px',
                fontSize: '14px',
              },
              success: {
                iconTheme: { primary: '#2D8B66', secondary: '#FFFFFF' },
              },
            }}
          />
          {children}
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
