'use client';

import { useSocketContext } from '@/contexts/SocketContext';

export function ConnectionStatus() {
  const { isConnected } = useSocketContext();

  return (
    <div className="hidden sm:flex items-center gap-1.5">
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isConnected
            ? 'bg-green-500 animate-pulse'
            : 'bg-red-400'
        }`}
      />
      <span
        className={`text-xs ${
          isConnected ? 'text-green-600' : 'text-red-500'
        }`}
      >
        {isConnected ? 'En vivo' : 'Sin conexion'}
      </span>
    </div>
  );
}
