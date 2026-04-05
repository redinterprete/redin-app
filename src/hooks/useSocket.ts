'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { SOCKET_URL } from '@/lib/socket';

export function useSocket() {
  const { dbUser } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!dbUser) return;

    let mounted = true;

    async function connect() {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token || !mounted) return;

        const socket = io(SOCKET_URL, {
          auth: { token },
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 10,
        });

        socket.on('connect', () => {
          console.log('Socket connected');
          if (mounted) setIsConnected(true);
        });

        socket.on('disconnect', () => {
          console.log('Socket disconnected');
          if (mounted) setIsConnected(false);
        });

        socket.on('connect_error', (err) => {
          console.warn('Socket connect_error:', err.message);
          if (mounted) setIsConnected(false);
        });

        // Refresh token on reconnect attempt
        socket.io.on('reconnect_attempt', async () => {
          try {
            const freshToken = await auth.currentUser?.getIdToken(true);
            if (freshToken) {
              socket.auth = { token: freshToken };
            }
          } catch {
            // Token refresh failed — socket will retry
          }
        });

        socketRef.current = socket;
      } catch {
        // Connection failed
      }
    }

    connect();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [dbUser]);

  return { socket: socketRef.current, isConnected };
}
