'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useSocketContext } from '@/contexts/SocketContext';
import { useSocketReconnect } from '@/hooks/useSocketReconnect';
import { formatDateTime, cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/Table';
import type { PaginatedResponse, Institution } from '@/types';

type ApprovalTab = 'APPROVED' | 'PENDING' | 'REJECTED' | 'SUSPENDED';

const approvalBadge: Record<string, { variant: 'green' | 'amber' | 'red' | 'gray'; label: string }> = {
  PENDING: { variant: 'amber', label: 'Pendiente' },
  APPROVED: { variant: 'green', label: 'Aprobada' },
  REJECTED: { variant: 'red', label: 'Rechazada' },
  SUSPENDED: { variant: 'gray', label: 'Suspendida' },
};

export default function InstitutionsPage() {
  const [data, setData] = useState<Institution[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [counts, setCounts] = useState<Record<ApprovalTab, number>>({ APPROVED: 0, PENDING: 0, REJECTED: 0, SUSPENDED: 0 });
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<ApprovalTab>('APPROVED');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Institution | null>(null);
  const [notes, setNotes] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showReject, setShowReject] = useState(false);
  const [saving, setSaving] = useState(false);
  const { socket } = useSocketContext();

  const fetchCounts = useCallback(async () => {
    const statuses: ApprovalTab[] = ['APPROVED', 'PENDING', 'REJECTED', 'SUSPENDED'];
    const results: Record<string, number> = {};
    for (const s of statuses) {
      try {
        const res = await api.get<PaginatedResponse<Institution>>(`/institutions?page=1&limit=1&approvalStatus=${s}`);
        results[s] = res.pagination.total;
      } catch { results[s] = 0; }
    }
    const c = results as Record<ApprovalTab, number>;
    setCounts(c);
    // Default to PENDING tab if there are pending institutions
    if (c.PENDING > 0) setTab('PENDING');
  }, []);

  const fetchData = useCallback(async (page: number, status: string, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20', approvalStatus: status });
      if (q) params.set('search', q);
      const res = await api.get<PaginatedResponse<Institution>>(`/institutions?${params}`);
      setData(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);
  useEffect(() => { fetchData(1, tab, search); }, [fetchData, tab, search]);

  // Refetch al reconectar (recupera eventos perdidos offline)
  useSocketReconnect(() => {
    fetchCounts();
    fetchData(pagination.page, tab, search);
  });

  // WebSocket: new institution registered
  useEffect(() => {
    if (!socket) return;
    const handle = () => {
      toast('Nueva institucion registrada', { icon: '🏛️' });
      fetchCounts();
      fetchData(1, tab, search);
    };
    socket.on('institution:registered', handle);
    return () => { socket.off('institution:registered', handle); };
  }, [socket, fetchCounts, fetchData, tab, search]);

  function openDetail(inst: Institution) {
    setSelected(inst);
    setNotes(inst.approvalNotes ?? '');
    setContractNumber(inst.contractNumber ?? '');
    setRejectReason('');
    setShowReject(false);
  }

  async function handleApprove() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/institutions/${selected.id}/approve`, { approvalNotes: notes || undefined, contractNumber: contractNumber || undefined });
      toast.success('Institucion aprobada');
      setSelected(null);
      fetchCounts();
      fetchData(1, tab, search);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  }

  async function handleReject() {
    if (!selected || rejectReason.length < 10) { toast.error('El motivo debe tener al menos 10 caracteres'); return; }
    setSaving(true);
    try {
      await api.patch(`/institutions/${selected.id}/reject`, { rejectionReason: rejectReason, approvalNotes: notes || undefined });
      toast.success('Institucion rechazada');
      setSelected(null);
      fetchCounts();
      fetchData(1, tab, search);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  }

  async function handleSuspend() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/institutions/${selected.id}/suspend`, { approvalNotes: notes || undefined });
      toast.success('Institucion suspendida');
      setSelected(null);
      fetchCounts();
      fetchData(1, tab, search);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  }

  async function handleReactivate() {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/institutions/${selected.id}/reactivate`, { approvalNotes: notes || undefined });
      toast.success('Institucion reactivada');
      setSelected(null);
      fetchCounts();
      fetchData(1, tab, search);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  }

  const tabs: { value: ApprovalTab; label: string }[] = [
    { value: 'APPROVED', label: 'Aprobadas' },
    { value: 'PENDING', label: 'Pendientes' },
    { value: 'REJECTED', label: 'Rechazadas' },
    { value: 'SUSPENDED', label: 'Suspendidas' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-redin-earth-900">Instituciones</h1>

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
            {t.label} {counts[t.value] > 0 && <span className="ml-1 text-xs">({counts[t.value]})</span>}
          </button>
        ))}
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Buscar institucion..."
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
          <EmptyState icon={Building2} title="Sin instituciones" description="No se encontraron instituciones con este filtro." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Solicitudes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((inst) => {
                  const badge = approvalBadge[inst.approvalStatus ?? 'PENDING'];
                  return (
                    <TableRow key={inst.id} className="cursor-pointer hover:bg-redin-earth-50" onClick={() => openDetail(inst)}>
                      <TableCell className="font-medium">{inst.name}</TableCell>
                      <TableCell>{inst.type && <Badge variant="gold" size="sm">{inst.type}</Badge>}</TableCell>
                      <TableCell>{inst.city ?? '--'}</TableCell>
                      <TableCell className="text-xs">{inst.user.email}</TableCell>
                      <TableCell><Badge variant={badge.variant} size="sm">{badge.label}</Badge></TableCell>
                      <TableCell className="text-xs">{inst.contractNumber ?? '--'}</TableCell>
                      <TableCell>{inst._count?.requests ?? 0}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between text-sm text-redin-earth-500">
              <span>{pagination.total} instituciones</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchData(pagination.page - 1, tab, search)}>Anterior</Button>
                <span className="px-3 py-1">Pagina {pagination.page} de {pagination.totalPages}</span>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchData(pagination.page + 1, tab, search)}>Siguiente</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      {/* Detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.name ?? ''} size="lg">
        {selected && (
          <div className="space-y-6">
            {/* Info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-redin-earth-500">Tipo</span><p className="font-medium">{selected.type ?? '--'}</p></div>
              <div><span className="text-redin-earth-500">Responsable</span><p className="font-medium">{selected.user.name}</p></div>
              <div><span className="text-redin-earth-500">Email</span><p className="font-medium">{selected.user.email}</p></div>
              <div><span className="text-redin-earth-500">Telefono</span><p className="font-medium">{selected.user.phone ?? '--'}</p></div>
              <div><span className="text-redin-earth-500">Ciudad</span><p className="font-medium">{selected.city ?? '--'}</p></div>
              <div><span className="text-redin-earth-500">Estado</span><p className="font-medium">{selected.state ?? '--'}</p></div>
              <div><span className="text-redin-earth-500">Fecha de registro</span><p className="font-medium">{selected.user.createdAt ? formatDateTime(selected.user.createdAt) : '--'}</p></div>
              <div>
                <span className="text-redin-earth-500">Estatus</span>
                <p><Badge variant={approvalBadge[selected.approvalStatus ?? 'PENDING'].variant} size="sm">{approvalBadge[selected.approvalStatus ?? 'PENDING'].label}</Badge></p>
              </div>
            </div>

            {selected.rejectionReason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-500 mb-1">Motivo de rechazo:</p>
                <p className="text-sm text-red-800">{selected.rejectionReason}</p>
              </div>
            )}

            {/* Admin fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-redin-earth-700 mb-1">Notas internas</label>
                <textarea
                  className="w-full p-3 border border-redin-earth-300 rounded-lg text-sm focus:ring-2 focus:ring-redin-gold-400 focus:border-transparent"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas internas (solo visible para admins)"
                />
              </div>
              {(selected.approvalStatus === 'PENDING' || selected.approvalStatus === 'APPROVED') && (
                <div>
                  <label className="block text-sm font-medium text-redin-earth-700 mb-1">Numero de contrato/convenio</label>
                  <input
                    type="text"
                    className="w-full p-3 border border-redin-earth-300 rounded-lg text-sm focus:ring-2 focus:ring-redin-gold-400 focus:border-transparent"
                    value={contractNumber}
                    onChange={(e) => setContractNumber(e.target.value)}
                    placeholder="Ej: CONV-2025-001"
                  />
                </div>
              )}
            </div>

            {/* Actions by status */}
            {selected.approvalStatus === 'PENDING' && !showReject && (
              <div className="flex gap-3">
                <Button className="flex-1" loading={saving} onClick={handleApprove}>Aprobar cuenta</Button>
                <Button variant="danger" className="flex-1" onClick={() => setShowReject(true)}>Rechazar</Button>
              </div>
            )}

            {showReject && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
                <label className="block text-sm font-medium text-red-800">Motivo del rechazo (minimo 10 caracteres)</label>
                <textarea
                  className="w-full p-3 border border-red-300 rounded-lg text-sm"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Este motivo sera visible para la institucion"
                />
                <div className="flex gap-3">
                  <Button variant="danger" loading={saving} onClick={handleReject}>Confirmar rechazo</Button>
                  <Button variant="outline" onClick={() => setShowReject(false)}>Cancelar</Button>
                </div>
              </div>
            )}

            {selected.approvalStatus === 'APPROVED' && (
              <Button variant="outline" loading={saving} onClick={handleSuspend}>Suspender cuenta</Button>
            )}

            {(selected.approvalStatus === 'REJECTED' || selected.approvalStatus === 'SUSPENDED') && (
              <Button loading={saving} onClick={handleReactivate}>Reactivar cuenta</Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
