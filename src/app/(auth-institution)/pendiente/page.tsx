'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock } from 'lucide-react';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useSocketContext } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type { ApiResponse, DbUser } from '@/types';

export default function PendientePage() {
  const { dbUser, signOut } = useAuth();
  const { socket } = useSocketContext();
  const router = useRouter();

  useEffect(() => {
    if (!socket) return;
    const handleApproved = () => {
      toast.success('Tu cuenta fue aprobada!');
      setTimeout(() => router.replace('/institucion'), 1500);
    };
    const handleRejected = () => {
      router.replace('/rechazada');
    };
    socket.on('institution:approved', handleApproved);
    socket.on('institution:rejected', handleRejected);
    return () => {
      socket.off('institution:approved', handleApproved);
      socket.off('institution:rejected', handleRejected);
    };
  }, [socket, router]);

  // Guard: if already approved, redirect
  useEffect(() => {
    if (dbUser?.institution?.approvalStatus === 'APPROVED') {
      router.replace('/institucion');
    }
  }, [dbUser, router]);

  // Polling fallback every 10 seconds
  useEffect(() => {
    const check = async () => {
      try {
        const res = await api.get<ApiResponse<DbUser>>('/auth/session');
        const status = res.data?.institution?.approvalStatus;
        if (status === 'APPROVED') {
          toast.success('Tu cuenta fue aprobada!');
          setTimeout(() => router.replace('/institucion'), 1500);
          return true;
        }
        if (status === 'REJECTED') { router.replace('/rechazada'); return true; }
      } catch { /* silent */ }
      return false;
    };
    const interval = setInterval(async () => {
      const done = await check();
      if (done) clearInterval(interval);
    }, 10000);
    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
          <Clock className="h-8 w-8 text-amber-600" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-redin-earth-900">
          Tu cuenta esta en revision
        </h2>
        <p className="text-sm text-redin-earth-600">
          El equipo de REDIN esta revisando tu solicitud de registro. Este proceso puede tomar 1-3 dias habiles mientras se formaliza el convenio.
        </p>
        <p className="text-sm text-redin-earth-500">
          Te notificaremos cuando tu cuenta este aprobada.
        </p>
      </div>

      <hr className="border-redin-earth-200" />

      <p className="text-xs text-redin-earth-400">
        Tienes preguntas? Escribenos a contacto.redinterpretes@gmail.com
      </p>

      <Button variant="outline" onClick={async () => {
        try { await firebaseSignOut(auth); } catch { /* */ }
        window.location.href = '/login-institucion';
      }}>
        Cerrar sesion
      </Button>
    </div>
  );
}
