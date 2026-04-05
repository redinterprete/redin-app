'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Spinner } from '@/components/ui/Spinner';

export default function LandingPage() {
  const { dbUser, loading } = useAuth();
  const router = useRouter();

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (loading) return;
    if (!dbUser) return;
    switch (dbUser.role) {
      case 'ADMIN':
        router.replace('/admin');
        break;
      case 'INSTITUTION':
        router.replace('/institucion');
        break;
      case 'INTERPRETER':
        router.replace('/interprete');
        break;
    }
  }, [dbUser, loading, router]);

  if (loading || dbUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-redin-earth-50">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-redin-earth-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-redin-forest-700 tracking-tight">
          REDIN
        </h1>
        <p className="mt-2 text-sm text-redin-earth-500">
          Red de Interpretes y Promotores Interculturales
        </p>
      </div>

      {/* Portal cards */}
      <div className="flex flex-col md:flex-row gap-6 max-w-2xl w-full px-4">
        {/* Institution portal */}
        <Link
          href="/login-institucion"
          className="flex-1 bg-white rounded-xl border-2 border-redin-gold-300 shadow-sm p-8 text-center hover:shadow-md hover:border-redin-gold-400 transition-all group"
        >
          <div className="h-14 w-14 mx-auto rounded-full bg-redin-gold-50 flex items-center justify-center mb-4 group-hover:bg-redin-gold-100 transition-colors">
            <Building2 className="h-7 w-7 text-redin-gold-500" />
          </div>
          <h2 className="text-lg font-semibold text-redin-earth-900 mb-1">
            Soy una institucion
          </h2>
          <p className="text-sm text-redin-earth-500">
            Solicita servicios de interpretacion
          </p>
        </Link>

        {/* Internal portal */}
        <Link
          href="/login"
          className="flex-1 bg-white rounded-xl border-2 border-redin-forest-400 shadow-sm p-8 text-center hover:shadow-md hover:border-redin-forest-500 transition-all group"
        >
          <div className="h-14 w-14 mx-auto rounded-full bg-redin-forest-50 flex items-center justify-center mb-4 group-hover:bg-redin-forest-100 transition-colors">
            <Users className="h-7 w-7 text-redin-forest-500" />
          </div>
          <h2 className="text-lg font-semibold text-redin-earth-900 mb-1">
            Soy interprete o administrador
          </h2>
          <p className="text-sm text-redin-earth-500">
            Accede al portal interno
          </p>
        </Link>
      </div>

      {/* Footer */}
      <p className="mt-10 text-xs text-redin-earth-400">
        Plataforma de interpretacion en lenguas indigenas de Oaxaca
      </p>
    </div>
  );
}
