'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function LoginInternoPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWrongPortal, setShowWrongPortal] = useState(false);
  const { dbUser, loading: authLoading, signIn, signOut } = useAuth();
  const router = useRouter();

  // Guard: redirect if already authenticated
  useEffect(() => {
    if (authLoading) return;
    if (!dbUser) return;
    if (dbUser.role === 'ADMIN') router.replace('/admin');
    else if (dbUser.role === 'INTERPRETER') router.replace('/interprete');
    else router.replace('/');
  }, [dbUser, authLoading, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setShowWrongPortal(false);
    setLoading(true);

    try {
      const user = await signIn(email, password);
      if (user.role === 'INSTITUTION') {
        await signOut();
        setError('Esta cuenta es de una institucion');
        setShowWrongPortal(true);
        setLoading(false);
        return;
      }
      // Contrasenas centralizadas (2026-05-11): los interpretes ya no son
      // redirigidos a cambiar contrasena. Su credencial la administra el admin.
      router.push(user.role === 'ADMIN' ? '/admin' : '/interprete');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message.includes('auth/')
            ? 'Credenciales invalidas'
            : err.message
          : 'Error al iniciar sesion'
      );
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || dbUser) return null;

  return (
    <>
      <h2 className="text-xl font-semibold text-redin-earth-900 mb-6">
        Iniciar sesion
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Correo electronico"
          type="email"
          placeholder="tu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          leftIcon={<Mail className="h-4 w-4" />}
          required
        />

        <Input
          label="Contrasena"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          required
        />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {showWrongPortal && (
          <p className="text-sm text-center">
            <Link href="/login-institucion" className="font-medium text-redin-gold-500 hover:text-redin-gold-600">
              Ir al portal institucional
            </Link>
          </p>
        )}

        <Button type="submit" fullWidth loading={loading}>
          Iniciar sesion
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-redin-earth-500">
        Interpretes y administradores son registrados por el coordinador de REDIN
      </p>
    </>
  );
}
