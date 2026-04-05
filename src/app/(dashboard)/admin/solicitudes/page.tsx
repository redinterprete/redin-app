'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Search, FileText, Eye, Clock, CheckCircle, ArrowRight, UserX, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { ZoomButton } from '@/components/shared/ZoomButton';
import { useSocketContext } from '@/contexts/SocketContext';
import { formatDateTime, formatDate, formatDuration, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import type { PaginatedResponse, ServiceRequest, RequestStatus } from '@/types';

const tabs: { label: string; value: RequestStatus | 'ALL' }[] = [
  { label: 'Todas', value: 'ALL' },
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'En curso', value: 'IN_PROGRESS' },
  { label: 'Completadas', value: 'COMPLETED' },
  { label: 'Canceladas', value: 'CANCELLED' },
  { label: 'No-show', value: 'NO_SHOW' },
];

interface TimelineStep {
  label: string;
  date?: string;
  active: boolean;
  completed: boolean;
}

function buildTimeline(req: ServiceRequest): TimelineStep[] {
  const steps: TimelineStep[] = [
    { label: 'Creada', date: req.createdAt, active: true, completed: true },
    {
      label: 'Aceptada',
      date: req.acceptedAt,
      active: !!req.acceptedAt,
      completed: !!req.acceptedAt,
    },
    {
      label: 'En curso',
      date: req.startedAt,
      active: !!req.startedAt,
      completed: !!req.startedAt,
    },
    {
      label: 'Completada',
      date: req.endedAt,
      active: !!req.endedAt,
      completed: !!req.endedAt,
    },
  ];

  if (req.status === 'CANCELLED') {
    steps.push({ label: 'Cancelada', active: true, completed: true });
  }

  return steps;
}

export default function SolicitudesPage() {
  const [data, setData] = useState<ServiceRequest[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<RequestStatus | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ServiceRequest | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleNoShow(id: string) {
    if (!confirm('Marcar esta solicitud como no-show?')) return;
    setActionLoading(true);
    try {
      await api.patch(`/requests/${id}/no-show`, {});
      setSelected(null);
      toast.success('Solicitud marcada como no-show');
      fetchData(pagination.page, tab, search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
    setActionLoading(false);
  }

  async function handleReassign(id: string) {
    if (!confirm('Reasignar esta solicitud? Se liberara el interprete actual.')) return;
    setActionLoading(true);
    try {
      await api.patch(`/requests/${id}/reassign`, {});
      setSelected(null);
      toast.success('Solicitud reasignada');
      fetchData(pagination.page, tab, search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
    setActionLoading(false);
  }

  const fetchData = useCallback(async (page: number, status: RequestStatus | 'ALL', q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status !== 'ALL') params.set('status', status);
      if (q) params.set('search', q);
      const res = await api.get<PaginatedResponse<ServiceRequest>>(`/requests?${params}`);
      setData(res.data);
      setPagination({
        page: res.pagination.page,
        totalPages: res.pagination.totalPages,
        total: res.pagination.total,
      });
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  const { socket } = useSocketContext();

  useEffect(() => {
    fetchData(1, tab, search);
  }, [fetchData, tab, search]);

  // Real-time updates
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!socket) return;
    const debouncedRefetch = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchData(pagination.page, tab, search), 500);
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
  }, [socket, fetchData, pagination.page, tab, search]);

  const timeline = selected ? buildTimeline(selected) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-redin-earth-900">Solicitudes</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-redin-earth-200">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
              tab === t.value
                ? 'border-redin-gold-400 text-redin-gold-600'
                : 'border-transparent text-redin-earth-500 hover:text-redin-earth-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Buscar por institución..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      <Card>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-10 bg-redin-earth-100 rounded animate-pulse" />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Sin solicitudes"
            description="No se encontraron solicitudes con los filtros actuales."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Institución</TableHead>
                  <TableHead>Lengua</TableHead>
                  <TableHead>Variante</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Intérprete</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((req) => (
                  <TableRow key={req.id} className="cursor-pointer hover:bg-redin-earth-50" onClick={() => setSelected(req)}>
                    <TableCell>{formatDateTime(req.createdAt)}</TableCell>
                    <TableCell className="font-medium">{req.institution.name}</TableCell>
                    <TableCell>{req.variant.language.name}</TableCell>
                    <TableCell className="text-xs">{req.variant.name}</TableCell>
                    <TableCell>
                      <Badge variant={req.type === 'IMMEDIATE' ? 'amber' : 'blue'} size="sm">
                        {req.type === 'IMMEDIATE' ? 'Inmediata' : 'Programada'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={req.status} size="sm" />
                    </TableCell>
                    <TableCell>
                      {req.interpreter?.user.name ?? (
                        <span className="text-redin-earth-300">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {req.durationMinutes ? formatDuration(req.durationMinutes) : '—'}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelected(req); }}
                        className="p-1 rounded hover:bg-redin-earth-100 text-redin-earth-400 hover:text-redin-earth-600 transition-colors"
                        aria-label="Ver detalle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between text-sm text-redin-earth-500">
              <span>{pagination.total} solicitudes</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchData(pagination.page - 1, tab, search)}
                >
                  Anterior
                </Button>
                <span className="px-3 py-1">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchData(pagination.page + 1, tab, search)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Detail modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Detalle de solicitud"
        size="lg"
      >
        {selected && (
          <div className="space-y-6">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-redin-earth-500">Institución</p>
                <p className="font-medium text-redin-earth-900">{selected.institution.name}</p>
              </div>
              <div>
                <p className="text-redin-earth-500">Solicitante</p>
                <p className="font-medium text-redin-earth-900">{selected.institution.user.name}</p>
              </div>
              <div>
                <p className="text-redin-earth-500">Lengua</p>
                <p className="font-medium text-redin-earth-900">
                  {selected.variant.language.name} — {selected.variant.name}
                </p>
              </div>
              <div>
                <p className="text-redin-earth-500">Tipo</p>
                <Badge variant={selected.type === 'IMMEDIATE' ? 'amber' : 'blue'} size="sm">
                  {selected.type === 'IMMEDIATE' ? 'Inmediata' : 'Programada'}
                </Badge>
              </div>
              <div>
                <p className="text-redin-earth-500">Estado</p>
                <StatusBadge status={selected.status} />
              </div>
              <div>
                <p className="text-redin-earth-500">Intérprete</p>
                <p className="font-medium text-redin-earth-900">
                  {selected.interpreter?.user.name ?? '—'}
                </p>
              </div>
              {selected.scheduledAt && (
                <div>
                  <p className="text-redin-earth-500">Programada para</p>
                  <p className="font-medium text-redin-earth-900">{formatDateTime(selected.scheduledAt)}</p>
                </div>
              )}
              {selected.durationMinutes && (
                <div>
                  <p className="text-redin-earth-500">Duración</p>
                  <p className="font-medium text-redin-earth-900">{formatDuration(selected.durationMinutes)}</p>
                </div>
              )}
              {selected.payment && (
                <div>
                  <p className="text-redin-earth-500">Monto</p>
                  <p className="font-medium text-redin-earth-900">{formatCurrency(selected.payment.amount)}</p>
                </div>
              )}
            </div>

            {selected.description && (
              <div>
                <p className="text-sm text-redin-earth-500 mb-1">Descripción</p>
                <p className="text-sm text-redin-earth-700 bg-redin-earth-50 rounded-lg p-3">
                  {selected.description}
                </p>
              </div>
            )}

            {selected.context && (
              <div>
                <p className="text-sm text-redin-earth-500 mb-1">Contexto</p>
                <p className="text-sm text-redin-earth-700 bg-redin-earth-50 rounded-lg p-3">
                  {selected.context}
                </p>
              </div>
            )}

            {/* Timeline */}
            <div>
              <p className="text-sm font-medium text-redin-earth-700 mb-3">Timeline</p>
              <div className="flex items-center gap-0">
                {timeline.map((step, i) => (
                  <div key={step.label} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={cn(
                          'h-8 w-8 rounded-full flex items-center justify-center',
                          step.completed
                            ? 'bg-redin-forest-100 text-redin-forest-600'
                            : 'bg-redin-earth-100 text-redin-earth-400'
                        )}
                      >
                        {step.completed ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Clock className="h-4 w-4" />
                        )}
                      </div>
                      <span
                        className={cn(
                          'text-xs mt-1 whitespace-nowrap',
                          step.completed ? 'text-redin-forest-600 font-medium' : 'text-redin-earth-400'
                        )}
                      >
                        {step.label}
                      </span>
                      {step.date && (
                        <span className="text-[10px] text-redin-earth-400">
                          {formatDate(step.date)}
                        </span>
                      )}
                    </div>
                    {i < timeline.length - 1 && (
                      <div className="mx-2 mb-6">
                        <ArrowRight
                          className={cn(
                            'h-4 w-4',
                            timeline[i + 1].completed
                              ? 'text-redin-forest-400'
                              : 'text-redin-earth-200'
                          )}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Zoom link */}
            {selected && ['ACCEPTED', 'IN_PROGRESS'].includes(selected.status) && selected.zoomJoinUrl && (
              <div className="border-t border-redin-earth-200 pt-4">
                <ZoomButton joinUrl={selected.zoomJoinUrl} password={selected.zoomPassword} size="md" />
              </div>
            )}

            {/* Admin actions */}
            {selected && ['ACCEPTED', 'IN_PROGRESS'].includes(selected.status) && (
              <div className="border-t border-redin-earth-200 pt-4 flex flex-wrap gap-3">
                <Button variant="danger" size="sm" leftIcon={<UserX className="h-4 w-4" />}
                  loading={actionLoading} onClick={() => handleNoShow(selected.id)}>
                  Marcar no-show
                </Button>
                <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />}
                  loading={actionLoading} onClick={() => handleReassign(selected.id)}>
                  Reasignar
                </Button>
              </div>
            )}
            {selected?.status === 'NO_SHOW' && (
              <div className="border-t border-redin-earth-200 pt-4">
                <Button variant="outline" size="sm" leftIcon={<RefreshCw className="h-4 w-4" />}
                  loading={actionLoading} onClick={() => handleReassign(selected.id)}>
                  Reasignar solicitud
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
