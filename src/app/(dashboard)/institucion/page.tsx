'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { FileText, CheckCircle, Clock, Play, PlusCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { ZoomButton } from '@/components/shared/ZoomButton';
import { useSocketContext } from '@/contexts/SocketContext';
import { StatsCard, StatsCardSkeleton } from '@/components/ui/StatsCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ApiResponse, InstitutionStats, PaginatedResponse, ServiceRequest } from '@/types';

export default function InstitucionDashboard() {
  const { dbUser } = useAuth();
  const [stats, setStats] = useState<InstitutionStats | null>(null);
  const [active, setActive] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const { socket } = useSocketContext();

  const loadData = useCallback(async () => {
    try {
      const s = await api.get<ApiResponse<InstitutionStats>>('/institution-profile/stats');
      setStats(s.data);
      const r = await api.get<PaginatedResponse<ServiceRequest>>(
        '/requests/institution-history?page=1&limit=10'
      );
      setActive(r.data);
    } catch { /* retry handled by api client */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time updates
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!socket) return;
    const debouncedRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(loadData, 500);
    };
    const handleUpdate = (data: { request: ServiceRequest }) => {
      setActive((prev) =>
        prev.map((r) => (r.id === data.request.id ? data.request : r))
      );
      debouncedRefetch();
    };
    socket.on('request:accepted', handleUpdate);
    socket.on('request:started', handleUpdate);
    socket.on('request:completed', handleUpdate);
    return () => {
      socket.off('request:accepted', handleUpdate);
      socket.off('request:started', handleUpdate);
      socket.off('request:completed', handleUpdate);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [socket, loadData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-redin-earth-900">
            Bienvenido, {dbUser?.institution?.name ?? dbUser?.name}
          </h1>
          <p className="text-sm text-redin-earth-500 mt-1">
            Panel de gestion de servicios de interpretacion
          </p>
        </div>
        <Link href="/institucion/nueva-solicitud">
          <Button size="lg" leftIcon={<PlusCircle className="h-5 w-5" />}>
            Nueva solicitud
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)
        ) : stats ? (
          <>
            <StatsCard title="Total solicitudes" value={stats.totalRequests} icon={FileText} accentColor="gold" />
            <StatsCard title="Completadas" value={stats.completedRequests} icon={CheckCircle} accentColor="green" />
            <StatsCard title="Pendientes" value={stats.pendingRequests} icon={Clock} accentColor="amber" />
            <StatsCard title="En curso" value={stats.inProgressRequests} icon={Play} accentColor="blue" />
          </>
        ) : null}
      </div>

      {/* Active requests */}
      <Card>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-redin-earth-900 mb-4">Solicitudes activas</h2>
          {loading ? (
            <div className="animate-pulse space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-redin-earth-100 rounded" />
              ))}
            </div>
          ) : active.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No tienes solicitudes activas"
              description="Crea una nueva solicitud para conectar con un interprete"
              actionLabel="Crear nueva solicitud"
              onAction={() => (window.location.href = '/institucion/nueva-solicitud')}
            />
          ) : (
            <div className="space-y-3">
              {active.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-redin-earth-200 hover:bg-redin-earth-50 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <StatusBadge status={req.status} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-redin-earth-900 truncate">
                        {req.variant?.language?.name} - {req.variant?.name}
                      </p>
                      <p className="text-xs text-redin-earth-500">{formatDateTime(req.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {['ACCEPTED', 'IN_PROGRESS'].includes(req.status) && req.zoomJoinUrl && (
                      <ZoomButton joinUrl={req.zoomJoinUrl} password={req.zoomPassword} size="md" />
                    )}
                    <Link href="/institucion/historial" className="text-sm text-redin-gold-600 hover:underline">
                      Ver detalle
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Most requested language */}
      {stats?.mostRequestedLanguage && (
        <Card>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-redin-earth-900 mb-2">Lengua mas solicitada</h2>
            <p className="text-2xl font-bold text-redin-gold-600">{stats.mostRequestedLanguage.name}</p>
            <p className="text-sm text-redin-earth-500">{stats.mostRequestedLanguage.count} solicitudes</p>
          </div>
        </Card>
      )}
    </div>
  );
}
