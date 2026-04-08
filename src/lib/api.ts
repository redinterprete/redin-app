import { auth } from './firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function getAuthToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const maxRetries = options.method && options.method !== 'GET' ? 0 : 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) {
      // Force logout on suspended/rejected institution
      if (res.status === 403 && data.details?.code === 'ACCOUNT_SUSPENDED') {
        if (typeof window !== 'undefined') {
          const { signOut } = await import('firebase/auth');
          const { auth: fbAuth } = await import('./firebase');
          await signOut(fbAuth).catch(() => {});
          window.location.href = '/suspendida';
        }
        throw new Error(data.error || 'Cuenta suspendida');
      }
      if (res.status === 403 && data.details?.code === 'ACCOUNT_PENDING') {
        if (typeof window !== 'undefined') window.location.href = '/pendiente';
        throw new Error(data.error || 'Cuenta pendiente');
      }

      // Retry on 500 for GET requests
      if (res.status >= 500 && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
        continue;
      }
      throw new Error(data.error || 'Error en la solicitud');
    }

    return data as T;
  }

  throw new Error('Error en la solicitud');
}

export const api = {
  get: <T>(endpoint: string) => fetchApi<T>(endpoint),

  post: <T>(endpoint: string, body: Record<string, unknown>) =>
    fetchApi<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),

  patch: <T>(endpoint: string, body: Record<string, unknown>) =>
    fetchApi<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),

  delete: <T>(endpoint: string) =>
    fetchApi<T>(endpoint, { method: 'DELETE' }),
};
