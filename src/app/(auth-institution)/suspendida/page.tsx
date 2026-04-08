'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useSocketContext } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import type { ApiResponse, DbUser } from '@/types';

export default function SuspendidaPage() {
  const { socket } = useSocketContext();
  const router = useRouter();

  useEffect(() => {
    if (!socket) return;
    const handleApproved = () => {
      toast.success('Tu cuenta fue reactivada!');
      setTimeout(() => router.replace('/institucion'), 1500);
    };
    socket.on('institution:approved', handleApproved);
    return () => { socket.off('institution:approved', handleApproved); };
  }, [socket, router]);

  // Polling fallback every 10 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get<ApiResponse<DbUser>>('/auth/session');
        if (res.data?.institution?.approvalStatus === 'APPROVED') {
          toast.success('Tu cuenta fue reactivada!');
          setTimeout(() => router.replace('/institucion'), 1500);
          clearInterval(interval);
        }
      } catch { /* silent */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [router]);

  async function handleLogout() {
    try { await signOut(auth); } catch { /* */ }
    window.location.href = '/login-institucion';
  }

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-amber-600" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-redin-earth-900">
          Tu cuenta ha sido suspendida
        </h2>
        <p className="text-sm text-redin-earth-500">
          Tu cuenta ha sido temporalmente suspendida. Para mas informacion contacta al equipo de REDIN.
        </p>
      </div>

      <hr className="border-redin-earth-200" />

      <p className="text-xs text-redin-earth-400">
        Escribenos a contacto.redinterpretes@gmail.com
      </p>

      <Button variant="outline" onClick={handleLogout}>
        Cerrar sesion
      </Button>
    </div>
  );
}
