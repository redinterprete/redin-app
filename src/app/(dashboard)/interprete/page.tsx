'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Bell, Zap, CalendarClock, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import { formatCurrency, timeAgo, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useSocketContext } from '@/contexts/SocketContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatsCard, StatsCardSkeleton } from '@/components/ui/StatsCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { contextLabel } from '@/components/shared/ContextSelector';
import type {
  ApiResponse,
  PaginatedResponse,
  ServiceRequest,
  InterpreterStats,
} from '@/types';

export default function InterpreteSolicitudesPage() {
  const router = useRouter();
  const [stats, setStats] = useState<InterpreterStats | null>(null);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [selected, setSelected] = useState<ServiceRequest | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [s, r, p] = await Promise.all([
        api.get<ApiResponse<InterpreterStats>>('/interpreter-profile/stats'),
        api.get<PaginatedResponse<ServiceRequest>>('/requests/available?page=1&limit=20'),
        api.get<ApiResponse<{ id: string; isAvailable: boolean }>>('/interpreter-profile'),
      ]);
      setStats(s.data);
      setRequests(r.data);
      setIsAvailable((p.data as { isAvailable: boolean }).isAvailable);
    } catch { /* */ }
    setLoading(false);
  }, []);

  const { socket } = useSocketContext();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time updates via Socket.IO (replaces 30s polling)
  useEffect(() => {
    if (!socket) return;

    const handleAvailable = (data: { request: ServiceRequest }) => {
      setRequests((prev) => [data.request, ...prev]);
    };
    const handleTaken = (data: { requestId: string }) => {
      setRequests((prev) => prev.filter((r) => r.id !== data.requestId));
    };

    socket.on('request:available', handleAvailable);
    socket.on('request:taken', handleTaken);

    return () => {
      socket.off('request:available', handleAvailable);
      socket.off('request:taken', handleTaken);
    };
  }, [socket]);

  async function toggleAvailability() {
    setToggling(true);
    try {
      const res = await api.patch<ApiResponse<{ isAvailable: boolean }>>('/interpreter-profile/availability', { isAvailable: !isAvailable });
      setIsAvailable(res.data.isAvailable);
    } catch { /* */ }
    setToggling(false);
  }

  async function handleAccept() {
    if (!selected) return;
    setAccepting(selected.id);
    try {
      await api.patch(`/requests/${selected.id}/accept`, {});
      setSelected(null);
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('tomada')) {
        setRequests((prev) => prev.filter((r) => r.id !== selected.id));
        setSelected(null);
        toast.error('Esta solicitud ya fue tomada por otro interprete');
      } else {
        toast.error(msg || 'Error al aceptar');
      }
    }
    setAccepting(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-redin-earth-900">Solicitudes disponibles</h1>
          <p className="text-sm text-redin-earth-500 mt-1">Solicitudes que coinciden con tus variantes linguisticas</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />} onClick={fetchData}>
            Actualizar
          </Button>
          <button
            onClick={toggleAvailability}
            disabled={toggling}
            className={cn(
              'relative inline-flex h-7 w-14 items-center rounded-full transition-colors',
              isAvailable ? 'bg-redin-forest-500' : 'bg-redin-earth-300'
            )}
          >
            <span className={cn('inline-block h-5 w-5 rounded-full bg-white transition-transform', isAvailable ? 'translate-x-8' : 'translate-x-1')} />
          </button>
          <span className="text-sm text-redin-earth-700">{isAvailable ? 'Disponible' : 'No disponible'}</span>
        </div>
      </div>

      {!isAvailable && (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
          Estas marcado como no disponible. No recibiras nuevas solicitudes.
          <button onClick={toggleAvailability} className="ml-2 underline font-medium">Cambiar</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <StatsCardSkeleton key={i} />)
        ) : stats ? (
          <>
            <StatsCard title="Servicios este mes" value={stats.servicesThisMonth} icon={Bell} accentColor="gold" />
            <StatsCard title="Ganancias este mes" value={formatCurrency(stats.earningsThisMonth)} icon={Bell} accentColor="green" />
            <StatsCard title="Pagos pendientes" value={stats.pendingPayments} icon={Bell} accentColor="amber" />
          </>
        ) : null}
      </div>

      {/* Requests list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-xl border border-redin-earth-200 animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <Card>
          <div className="p-6">
            <EmptyState icon={Bell} title="No hay solicitudes disponibles" description="No hay solicitudes que coincidan con tus lenguas en este momento" />
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <Card key={req.id}>
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn(
                        'inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full',
                        req.type === 'IMMEDIATE' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {req.type === 'IMMEDIATE' ? <><Zap className="h-3 w-3" /> Inmediata</> : <><CalendarClock className="h-3 w-3" /> Agendada</>}
                      </span>
                      {req.context && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-redin-earth-100 text-redin-earth-600 capitalize">
                          {contextLabel(req.context)}
                        </span>
                      )}
                      <span className="text-xs text-redin-earth-400">{timeAgo(req.createdAt)}</span>
                    </div>
                    <p className="text-lg font-semibold text-redin-earth-900">
                      {req.variant?.language?.name} — {req.variant?.name}
                    </p>
                    <p className="text-sm text-redin-earth-600">{req.institution?.user?.name ?? req.institution?.name}</p>
                    {req.description && (
                      <p className="text-sm text-redin-earth-500 line-clamp-2">{req.description}</p>
                    )}
                    {req.type === 'SCHEDULED' && req.scheduledAt && (
                      <p className="text-sm font-medium text-blue-700">Programada: {formatDateTime(req.scheduledAt)}</p>
                    )}
                  </div>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto shrink-0 min-h-[48px]"
                    onClick={() => setSelected(req)}
                  >
                    Aceptar solicitud
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Accept confirmation modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Aceptar solicitud" size="sm">
        {selected && (
          <div className="space-y-4">
            <p className="text-sm text-redin-earth-600">Confirma que deseas aceptar esta solicitud:</p>
            <div className="text-sm space-y-1 bg-redin-earth-50 p-3 rounded-lg">
              <p><span className="text-redin-earth-500">Lengua:</span> <span className="font-medium">{selected.variant?.language?.name} — {selected.variant?.name}</span></p>
              <p><span className="text-redin-earth-500">Institucion:</span> <span className="font-medium">{selected.institution?.user?.name}</span></p>
              <p><span className="text-redin-earth-500">Tipo:</span> <span className="font-medium">{selected.type === 'IMMEDIATE' ? 'Inmediata' : 'Agendada'}</span></p>
              {selected.context && <p><span className="text-redin-earth-500">Contexto:</span> <span className="font-medium capitalize">{contextLabel(selected.context)}</span></p>}
            </div>
            <p className="text-xs text-redin-earth-500">
              {selected.type === 'IMMEDIATE'
                ? 'Se creara una reunion de Zoom para conectarte con la institucion.'
                : `Te comprometes a estar disponible el ${selected.scheduledAt ? formatDateTime(selected.scheduledAt) : ''}. Se te enviara el enlace de Zoom.`}
            </p>
          </div>
        )}
        <div className="flex gap-3 justify-end mt-4">
          <Button variant="outline" onClick={() => setSelected(null)}>Cancelar</Button>
          <Button loading={!!accepting} onClick={handleAccept}>Confirmar</Button>
        </div>
      </Modal>
    </div>
  );
}
