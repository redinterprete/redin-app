'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { type Socket } from 'socket.io-client';
import { useSocket } from '@/hooks/useSocket';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  /**
   * Timestamp de la ultima re-conexion (NO la inicial). Cambia cada vez que
   * el socket reconecta tras una desconexion. Las paginas que escuchan eventos
   * Socket.IO deben usar `useSocketReconnect()` para refetchar sus datos al
   * reconectarse — los eventos emitidos mientras el cliente estaba offline
   * se perdieron en el aire y la unica manera de recuperar el estado es
   * preguntarle al server.
   */
  lastReconnectAt: number | null;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  lastReconnectAt: null,
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { socket, isConnected, lastReconnectAt } = useSocket();

  return (
    <SocketContext.Provider value={{ socket, isConnected, lastReconnectAt }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocketContext(): SocketContextValue {
  return useContext(SocketContext);
}
