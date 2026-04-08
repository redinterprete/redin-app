'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSocketContext } from '@/contexts/SocketContext';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

export default function RechazadaPage() {
  const { dbUser, signOut } = useAuth();
  const { socket } = useSocketContext();
  const router = useRouter();

  useEffect(() => {
    if (!socket) return;
    const handleApproved = () => {
      toast.success('Tu cuenta fue aprobada!');
      setTimeout(() => router.replace('/institucion'), 1500);
    };
    socket.on('institution:approved', handleApproved);
    return () => { socket.off('institution:approved', handleApproved); };
  }, [socket, router]);

  const rejectionReason = dbUser?.institution?.rejectionReason;

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-redin-earth-900">
          Tu solicitud no fue aprobada
        </h2>

        {rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-left">
            <p className="text-xs text-red-500 mb-1">Motivo:</p>
            <p className="text-sm text-red-800">{rejectionReason}</p>
          </div>
        )}

        <p className="text-sm text-redin-earth-500">
          Si crees que esto es un error o deseas mas informacion, contacta al equipo de REDIN.
        </p>
      </div>

      <hr className="border-redin-earth-200" />

      <p className="text-xs text-redin-earth-400">
        Escribenos a contacto.redinterpretes@gmail.com
      </p>

      <Button variant="outline" onClick={() => signOut()}>
        Cerrar sesion
      </Button>
    </div>
  );
}
