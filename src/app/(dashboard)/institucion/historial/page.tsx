'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { useSocketContext } from '@/contexts/SocketContext';
import { formatDateTime } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { RequestTimeline } from '@/components/shared/RequestTimeline';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import type { PaginatedResponse, ServiceRequest, RequestStatus } from '@/types';

const tabs = [
  { label: 'Todas', value: '' },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'En curso', value: 'IN_PROGRESS' },
  { label: 'Completadas', value: 'COMPLETED' },
  { label: 'Canceladas', value: 'CANCELLED' },
];

export default function HistorialInstitucionPage() {
  const [data, setData] = useState<ServiceRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (tab) params.set('status', tab);
      const res = await api.get<PaginatedResponse<ServiceRequest>>(`/requests/institution-history?${params}`);
      setData(res.data);
      setTotal(res.pagination.total);
    } catch { /* */ }
    setLoading(false);
  }, [page, tab]);

  const { socket } = useSocketContext();

  useEffect(() => { fetchData(); }, [fetchData]);

  // Real-time updates
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!socket) return;
    const debouncedRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(fetchData, 500);
    };
    socket.on('request:created', debouncedRefetch);
    socket.on('request:accepted', debouncedRefetch);
    socket.on('request:started', debouncedRefetch);
    socket.on('request:completed', debouncedRefetch);
    socket.on('request:cancelled', debouncedRefetch);
    return () => {
      socket.off('request:created', debouncedRefetch);
      socket.off('request:accepted', debouncedRefetch);
      socket.off('request:started', debouncedRefetch);
      socket.off('request:completed', debouncedRefetch);
      socket.off('request:cancelled', debouncedRefetch);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [socket, fetchData]);

  async function handleCancel(id: string) {
    if (!confirm('Estas seguro de cancelar esta solicitud?')) return;
    setCancelling(true);
    try {
      await api.patch(`/requests/${id}/cancel`, {});
      setSelected(null);
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al cancelar');
    }
    setCancelling(false);
  }

  const totalPages = Math.ceil(total / 15);
  const cancellable = (s: RequestStatus) => ['PENDING', 'NOTIFIED', 'ACCEPTED'].includes(s);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-redin-earth-900">Historial de solicitudes</h1>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-redin-earth-200">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => { setTab(t.value); setPage(1); }}
            className={cn(
              'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              tab === t.value
                ? 'border-redin-gold-400 text-redin-gold-700'
                : 'border-transparent text-redin-earth-500 hover:text-redin-earth-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : data.length === 0 ? (
            <EmptyState icon={FileText} title="No hay solicitudes" description="No se encontraron solicitudes con estos filtros" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-redin-earth-200 text-left text-redin-earth-500">
                      <th className="pb-3 font-medium">Fecha</th>
                      <th className="pb-3 font-medium">Lengua</th>
                      <th className="pb-3 font-medium">Tipo</th>
                      <th className="pb-3 font-medium">Estado</th>
                      <th className="pb-3 font-medium">Interprete</th>
                      <th className="pb-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((req) => (
                      <tr
                        key={req.id}
                        className="border-b border-redin-earth-100 hover:bg-redin-earth-50 cursor-pointer transition-colors"
                        onClick={() => setSelected(req)}
                      >
                        <td className="py-3 text-redin-earth-700">{formatDateTime(req.createdAt)}</td>
                        <td className="py-3 text-redin-earth-900 font-medium">
                          {req.variant?.language?.name} - {req.variant?.name}
                        </td>
                        <td className="py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full', req.type === 'IMMEDIATE' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700')}>
                            {req.type === 'IMMEDIATE' ? 'Inmediata' : 'Agendada'}
                          </span>
                        </td>
                        <td className="py-3"><StatusBadge status={req.status} /></td>
                        <td className="py-3 text-redin-earth-600">{req.interpreter?.user?.name ?? '—'}</td>
                        <td className="py-3">
                          {cancellable(req.status) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleCancel(req.id); }}
                            >
                              Cancelar
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                  <span className="px-3 py-1.5 text-sm text-redin-earth-600">{page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle de solicitud" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-redin-earth-500">Lengua:</span> <span className="font-medium">{selected.variant?.language?.name}</span></div>
              <div><span className="text-redin-earth-500">Variante:</span> <span className="font-medium">{selected.variant?.name}</span></div>
              <div><span className="text-redin-earth-500">Tipo:</span> <span className="font-medium">{selected.type === 'IMMEDIATE' ? 'Inmediata' : 'Agendada'}</span></div>
              {selected.context && <div><span className="text-redin-earth-500">Contexto:</span> <span className="font-medium capitalize">{selected.context}</span></div>}
              {selected.interpreter?.user?.name && <div><span className="text-redin-earth-500">Interprete:</span> <span className="font-medium">{selected.interpreter.user.name}</span></div>}
              {selected.scheduledAt && <div><span className="text-redin-earth-500">Agendada:</span> <span className="font-medium">{formatDateTime(selected.scheduledAt)}</span></div>}
            </div>
            {selected.description && (
              <div className="text-sm"><span className="text-redin-earth-500">Descripcion:</span><p className="mt-1 text-redin-earth-700">{selected.description}</p></div>
            )}
            <div className="border-t border-redin-earth-200 pt-4">
              <h4 className="text-sm font-medium text-redin-earth-700 mb-3">Progreso</h4>
              <RequestTimeline request={selected} />
            </div>
          </div>
        )}
        {selected && cancellable(selected.status) && (
          <div className="mt-4 flex justify-end">
            <Button variant="danger" size="sm" loading={cancelling} onClick={() => handleCancel(selected.id)}>
              Cancelar solicitud
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
