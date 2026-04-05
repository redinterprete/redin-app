'use client';

import { useEffect, useState, useCallback } from 'react';
import { History, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime, formatDuration, formatCurrency } from '@/lib/utils';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatsCard, StatsCardSkeleton } from '@/components/ui/StatsCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { RequestTimeline } from '@/components/shared/RequestTimeline';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import type { ApiResponse, PaginatedResponse, ServiceRequest, InterpreterStats } from '@/types';

export default function HistorialInterpretePage() {
  const [data, setData] = useState<ServiceRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState<InterpreterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ServiceRequest | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([
        api.get<PaginatedResponse<ServiceRequest>>(`/requests/my-history?page=${page}&limit=15`),
        api.get<ApiResponse<InterpreterStats>>('/interpreter-profile/stats'),
      ]);
      setData(r.data);
      setTotal(r.pagination.total);
      setStats(s.data);
    } catch { /* */ }
    setLoading(false);
  }, [page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-redin-earth-900">Mi historial de servicios</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {!stats ? (
          <><StatsCardSkeleton /><StatsCardSkeleton /></>
        ) : (
          <>
            <StatsCard title="Total servicios" value={stats.totalServices} icon={History} accentColor="gold" />
            <StatsCard title="Total ganado" value={formatCurrency(stats.totalEarnings)} icon={History} accentColor="green" />
          </>
        )}
      </div>

      <Card>
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : data.length === 0 ? (
            <EmptyState icon={FileText} title="Sin historial" description="Aun no has completado ningun servicio" />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-redin-earth-200 text-left text-redin-earth-500">
                      <th className="pb-3 font-medium">Fecha</th>
                      <th className="pb-3 font-medium">Institucion</th>
                      <th className="pb-3 font-medium">Lengua</th>
                      <th className="pb-3 font-medium">Duracion</th>
                      <th className="pb-3 font-medium">Monto</th>
                      <th className="pb-3 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((req) => (
                      <tr key={req.id} className="border-b border-redin-earth-100 hover:bg-redin-earth-50 cursor-pointer" onClick={() => setSelected(req)}>
                        <td className="py-3 text-redin-earth-700">{formatDateTime(req.createdAt)}</td>
                        <td className="py-3 text-redin-earth-900">{req.institution?.user?.name}</td>
                        <td className="py-3 text-redin-earth-700">{req.variant?.language?.name}</td>
                        <td className="py-3 text-redin-earth-700">{req.durationMinutes ? formatDuration(req.durationMinutes) : '—'}</td>
                        <td className="py-3 font-medium text-redin-earth-900">{req.payment ? formatCurrency(req.payment.amount) : '—'}</td>
                        <td className="py-3"><StatusBadge status={req.status} /></td>
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

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detalle del servicio" size="md">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-redin-earth-500">Institucion:</span><p className="font-medium">{selected.institution?.user?.name}</p></div>
              <div><span className="text-redin-earth-500">Lengua:</span><p className="font-medium">{selected.variant?.language?.name} - {selected.variant?.name}</p></div>
              {selected.context && <div><span className="text-redin-earth-500">Contexto:</span><p className="font-medium capitalize">{selected.context}</p></div>}
              {selected.durationMinutes && <div><span className="text-redin-earth-500">Duracion:</span><p className="font-medium">{formatDuration(selected.durationMinutes)}</p></div>}
              {selected.payment && <div><span className="text-redin-earth-500">Monto:</span><p className="font-medium text-redin-forest-700">{formatCurrency(selected.payment.amount)}</p></div>}
            </div>
            <div className="border-t border-redin-earth-200 pt-4">
              <RequestTimeline request={selected} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
