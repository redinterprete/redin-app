'use client';

import { useEffect, useRef } from 'react';
import { useSocketContext } from '@/contexts/SocketContext';

/**
 * Ejecuta `callback` cada vez que el socket se RE-conecta (no en la primera
 * conexion). Util para hacer refetch silencioso de queries cuyos eventos
 * Socket.IO se perdieron mientras el cliente estaba offline.
 *
 * El backend emite eventos como `request:available`, `payment:approved`, etc.
 * via `getIO().to(room).emit(...)`. Si el cliente esta desconectado, esos
 * eventos se pierden — el server no los persiste. Para recuperar el estado
 * tras una reconexion, el cliente debe volver a leer la DB via REST.
 *
 * Uso tipico en una pagina:
 *
 *   useSocketReconnect(() => fetchData(true));
 *
 * El callback se ejecuta solo en re-conexiones (NO en el mount inicial), asi
 * no duplica el fetch que hace el useEffect de carga inicial.
 */
export function useSocketReconnect(callback: () => void): void {
  const { lastReconnectAt } = useSocketContext();
  // Mantenemos `callback` en una ref para evitar suscripciones cada render
  // si el caller no envuelve el callback en useCallback.
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (lastReconnectAt) cbRef.current();
  }, [lastReconnectAt]);
}
