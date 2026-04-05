'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { ApiResponse } from '@/types';

export default function CambiarContrasenaPage() {
  const router = useRouter();
  const { dbUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function getStrength(): { label: string; color: string; width: string } {
    if (newPassword.length === 0) return { label: '', color: '', width: 'w-0' };
    if (newPassword.length < 6) return { label: 'Debil', color: 'bg-red-400', width: 'w-1/4' };
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
    const score = [newPassword.length >= 8, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;
    if (score >= 3) return { label: 'Fuerte', color: 'bg-green-500', width: 'w-full' };
    if (score >= 2) return { label: 'Media', color: 'bg-amber-400', width: 'w-2/3' };
    return { label: 'Debil', color: 'bg-red-400', width: 'w-1/3' };
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setFieldError('');

    if (newPassword.length < 6) {
      setFieldError('La nueva contrasena debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword === currentPassword) {
      setFieldError('La nueva contrasena no puede ser igual a la actual');
      return;
    }
    if (newPassword !== confirmPassword) {
      setFieldError('Las contrasenas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await api.post<ApiResponse<{ message: string }>>('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setSuccess(true);
      // Wait then redirect
      setTimeout(() => {
        // Force reload to update dbUser session (mustChangePassword now false)
        window.location.href = '/interprete';
      }, 1500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar contrasena';
      if (msg.includes('actual')) {
        setError('Contrasena actual incorrecta');
      } else {
        setError(msg);
      }
    }
    setLoading(false);
  }

  const strength = getStrength();

  if (success) {
    return (
      <div className="text-center space-y-4 py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
        <h2 className="text-xl font-semibold text-redin-earth-900">
          Contrasena actualizada
        </h2>
        <p className="text-sm text-redin-earth-500">
          Redirigiendo al panel de interprete...
        </p>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-redin-earth-900 mb-2">
        Bienvenido a REDIN
      </h2>
      <p className="text-sm text-redin-earth-500 mb-6">
        Por seguridad, debes cambiar tu contrasena temporal antes de continuar.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Contrasena temporal"
          type="password"
          placeholder="REDIN-XXXX"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          required
        />

        <div>
          <Input
            label="Nueva contrasena"
            type="password"
            placeholder="Minimo 6 caracteres"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            leftIcon={<Lock className="h-4 w-4" />}
            required
          />
          {newPassword.length > 0 && (
            <div className="mt-2">
              <div className="h-1.5 bg-redin-earth-100 rounded-full overflow-hidden">
                <div className={`h-full ${strength.color} ${strength.width} transition-all duration-300 rounded-full`} />
              </div>
              <p className="text-xs text-redin-earth-500 mt-1">{strength.label}</p>
            </div>
          )}
        </div>

        <Input
          label="Confirmar nueva contrasena"
          type="password"
          placeholder="Repite la nueva contrasena"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          leftIcon={<Lock className="h-4 w-4" />}
          required
        />

        {fieldError && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
            {fieldError}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" fullWidth loading={loading}>
          Cambiar contrasena
        </Button>
      </form>

      {dbUser && (
        <p className="mt-4 text-center text-xs text-redin-earth-400">
          Sesion: {dbUser.email}
        </p>
      )}
    </>
  );
}
