'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, DollarSign, Clock, CheckCircle, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatsCard, StatsCardSkeleton } from '@/components/ui/StatsCard';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import type { PaginatedResponse, ApiResponse, Payment, PaymentSummary } from '@/types';

const tabs: { label: string; value: 'PENDING' | 'COMPLETED' | 'ALL' }[] = [
  { label: 'Pendientes', value: 'PENDING' },
  { label: 'Pagados', value: 'COMPLETED' },
  { label: 'Todos', value: 'ALL' },
];

export default function PagosPage() {
  const [data, setData] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'PENDING' | 'COMPLETED' | 'ALL'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [confirmPayment, setConfirmPayment] = useState<Payment | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get<ApiResponse<PaymentSummary>>('/payments/summary');
      setSummary(res.data);
    } catch { /* empty */ }
    setSummaryLoading(false);
  }, []);

  const fetchData = useCallback(async (page: number, status: string, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (status !== 'ALL') params.set('status', status);
      if (q) params.set('search', q);
      const res = await api.get<PaginatedResponse<Payment>>(`/payments?${params}`);
      setData(res.data);
      setPagination({
        page: res.pagination.page,
        totalPages: res.pagination.totalPages,
        total: res.pagination.total,
      });
    } catch { /* empty */ }
    setLoading(false);
  }, []);

  // Cargar summary y datos secuencialmente para no saturar el adapter
  useEffect(() => {
    async function loadAll() {
      await fetchSummary();
      await fetchData(1, tab, search);
    }
    loadAll();
  }, [fetchSummary, fetchData, tab, search]);

  async function markAsPaid() {
    if (!confirmPayment) return;
    setSaving(true);
    try {
      await api.patch(`/payments/${confirmPayment.id}/mark-paid`, {});
      setConfirmPayment(null);
      await Promise.all([fetchData(1, tab, search), fetchSummary()]);
    } catch { /* empty */ }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-redin-earth-900">Pagos</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)
        ) : summary ? (
          <>
            <StatsCard
              title="Pendiente total"
              value={formatCurrency(summary.totalPending)}
              icon={Clock}
              accentColor="amber"
            />
            <StatsCard
              title="Pagos pendientes"
              value={summary.countPending}
              icon={CreditCard}
              accentColor="gold"
            />
            <StatsCard
              title="Pagado este mes"
              value={formatCurrency(summary.totalPaidThisMonth)}
              icon={CheckCircle}
              accentColor="green"
            />
            <StatsCard
              title="Pagos completados (mes)"
              value={summary.countPaidThisMonth}
              icon={DollarSign}
              accentColor="forest"
            />
          </>
        ) : null}
      </div>

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
          placeholder="Buscar por intérprete..."
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
            icon={DollarSign}
            title="Sin pagos"
            description="No se encontraron pagos con los filtros actuales."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Intérprete</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>CLABE</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDateTime(payment.createdAt)}</TableCell>
                    <TableCell className="font-medium">
                      {payment.interpreter.user.name}
                    </TableCell>
                    <TableCell className="text-xs">
                      {payment.request.variant.language.name} — {payment.request.variant.name}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={payment.status === 'COMPLETED' ? 'green' : payment.status === 'PENDING' ? 'amber' : 'blue'}
                        size="sm"
                      >
                        {payment.status === 'COMPLETED' ? 'Pagado' : payment.status === 'PENDING' ? 'Pendiente' : payment.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{payment.bankName ?? '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{payment.bankClabe ?? '—'}</TableCell>
                    <TableCell>
                      {payment.status === 'PENDING' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmPayment(payment)}
                        >
                          Marcar pagado
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between text-sm text-redin-earth-500">
              <span>{pagination.total} pagos</span>
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

      {/* Confirm payment modal */}
      <Modal
        open={!!confirmPayment}
        onClose={() => setConfirmPayment(null)}
        title="Confirmar pago"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmPayment(null)}>
              Cancelar
            </Button>
            <Button onClick={markAsPaid} loading={saving}>
              Confirmar pago
            </Button>
          </>
        }
      >
        {confirmPayment && (
          <div className="space-y-3 text-sm">
            <p className="text-redin-earth-600">
              ¿Confirmas que se realizó el pago al intérprete?
            </p>
            <div className="bg-redin-earth-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-redin-earth-500">Intérprete</span>
                <span className="font-medium text-redin-earth-900">
                  {confirmPayment.interpreter.user.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-redin-earth-500">Monto</span>
                <span className="font-semibold text-redin-earth-900">
                  {formatCurrency(confirmPayment.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-redin-earth-500">Banco</span>
                <span className="text-redin-earth-900">{confirmPayment.bankName ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-redin-earth-500">CLABE</span>
                <span className="font-mono text-redin-earth-900">{confirmPayment.bankClabe ?? '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-redin-earth-500">Titular</span>
                <span className="text-redin-earth-900">{confirmPayment.bankHolder ?? '—'}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
