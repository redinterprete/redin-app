'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { api } from '@/lib/api';
import type { DbUser, ApiResponse } from '@/types';

interface AuthState {
  user: FirebaseUser | null;
  dbUser: DbUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<DbUser>;
  signUp: (
    email: string,
    password: string,
    userData: {
      name: string;
      phone?: string;
      role: string;
      institutionData?: {
        name: string;
        type?: string;
        address?: string;
        city?: string;
        state?: string;
      };
    }
  ) => Promise<DbUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    dbUser: null,
    loading: true,
    error: null,
  });

  // Flag para evitar que onAuthStateChanged duplique la carga cuando signIn/signUp ya la hicieron
  const handledByAction = useRef(false);

  // Carga el usuario del backend a partir del user de Firebase
  const loadDbUser = useCallback(async (): Promise<DbUser | null> => {
    try {
      const res = await api.get<ApiResponse<DbUser>>('/auth/session');
      return res.data;
    } catch {
      return null;
    }
  }, []);

  // Listener de cambios de auth en Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Si signIn/signUp ya manejaron el estado, skip para evitar doble fetch
      if (handledByAction.current) {
        handledByAction.current = false;
        return;
      }

      if (firebaseUser) {
        const dbUser = await loadDbUser();
        if (dbUser) {
          setState({ user: firebaseUser, dbUser, loading: false, error: null });
        } else {
          await firebaseSignOut(auth);
          setState({ user: null, dbUser: null, loading: false, error: null });
        }
      } else {
        setState({ user: null, dbUser: null, loading: false, error: null });
      }
    });

    return () => unsubscribe();
  }, [loadDbUser]);

  const signIn = async (email: string, password: string): Promise<DbUser> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      handledByAction.current = true;

      // 1. Pre-login: check si la cuenta esta bloqueada por 5 intentos fallidos.
      // El backend responde 423 si esta bloqueada con `retryAfter`.
      try {
        await api.post('/auth/check-login', { email });
      } catch (lockErr) {
        // Si es 423 ACCOUNT_LOCKED, propagamos el mensaje exacto.
        throw lockErr;
      }

      // 2. Firebase signIn — si falla, registramos el intento fallido en backend.
      let cred;
      try {
        cred = await signInWithEmailAndPassword(auth, email, password);
      } catch (fbErr) {
        // No esperamos respuesta — fire and forget. Si el usuario no existe,
        // el backend hace dummy timing para no leakear.
        api.post('/auth/record-failed-login', { email }).catch(() => {});
        throw fbErr;
      }

      const dbUser = await loadDbUser();
      if (!dbUser) throw new Error('Usuario no registrado en el sistema');
      setState({ user: cred.user, dbUser, loading: false, error: null });
      return dbUser;
    } catch (err) {
      handledByAction.current = false;
      const message =
        err instanceof Error ? err.message : 'Error al iniciar sesión';
      setState((s) => ({ ...s, loading: false, error: message }));
      throw err;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: {
      name: string;
      phone?: string;
      role: string;
      institutionData?: {
        name: string;
        type?: string;
        address?: string;
        city?: string;
        state?: string;
      };
    }
  ): Promise<DbUser> => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      handledByAction.current = true;
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // Espera a que el token Firebase este listo (createUser hace signIn auto).
      // El backend toma el uid del Authorization header, no del body — es por
      // eso que NO mandamos firebaseUid en el payload (defensa contra spoofing).
      await cred.user.getIdToken(true);
      const res = await api.post<ApiResponse<DbUser>>('/auth/register', {
        email,
        ...userData,
      });
      setState({ user: cred.user, dbUser: res.data, loading: false, error: null });
      return res.data;
    } catch (err) {
      handledByAction.current = false;
      const message =
        err instanceof Error ? err.message : 'Error al registrar';
      setState((s) => ({ ...s, loading: false, error: message }));
      throw err;
    }
  };

  const signOutUser = async () => {
    await firebaseSignOut(auth);
    setState({ user: null, dbUser: null, loading: false, error: null });
  };

  return (
    <AuthContext.Provider
      value={{ ...state, signIn, signUp, signOut: signOutUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
