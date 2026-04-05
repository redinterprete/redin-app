'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { dbUser, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;

    if (!dbUser) {
      router.replace('/');
      return;
    }

    // Intérprete con contraseña temporal debe cambiarla antes de usar el panel
    if (
      dbUser.role === 'INTERPRETER' &&
      dbUser.interpreter?.mustChangePassword &&
      pathname !== '/cambiar-contrasena'
    ) {
      router.replace('/cambiar-contrasena');
      return;
    }

    if (allowedRoles && !allowedRoles.includes(dbUser.role)) {
      // Redirige al dashboard correcto según rol
      if (dbUser.role === 'ADMIN') router.replace('/admin');
      else if (dbUser.role === 'INSTITUTION') router.replace('/institucion');
      else if (dbUser.role === 'INTERPRETER') router.replace('/interprete');
    }
  }, [dbUser, loading, allowedRoles, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-redin-earth-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!dbUser) return null;
  if (allowedRoles && !allowedRoles.includes(dbUser.role)) return null;

  return <>{children}</>;
}
