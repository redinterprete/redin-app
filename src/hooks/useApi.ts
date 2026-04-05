'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const lastEndpoint = useRef<string | null>(null);

  const execute = useCallback(async (endpoint: string): Promise<T | null> => {
    lastEndpoint.current = endpoint;
    setState({ data: null, loading: true, error: null });
    try {
      const result = await api.get<T>(endpoint);
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar datos';
      setState({ data: null, loading: false, error: message });
      return null;
    }
  }, []);

  const refetch = useCallback(() => {
    if (lastEndpoint.current) execute(lastEndpoint.current);
  }, [execute]);

  return { ...state, execute, refetch };
}

export function useFetch<T>(endpoint: string | null) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: !!endpoint,
    error: null,
  });

  const fetchData = useCallback(async () => {
    if (!endpoint) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const result = await api.get<T>(endpoint);
      setState({ data: result, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar datos';
      setState({ data: null, loading: false, error: message });
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { ...state, refetch: fetchData };
}
