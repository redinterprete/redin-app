'use client';

import { useEffect, useState, useCallback } from 'react';
import { CreditCard, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatCurrency, formatDateTime, cn } from '@/lib/utils';
import { useSocketContext } from '@/contexts/SocketContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatsCard, StatsCardSkeleton } from '@/components/ui/StatsCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import type { ApiResponse, PaginatedResponse, Payment, PaymentSummaryInterpreter } from '@/types';

export default function PagosInterpretePage() {
  const [summary, setSummary] = useState<PaymentSummaryInterpreter | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'PENDING' | 'COMPLETED'>('PENDING');
  const [confirming, setConfirming] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.get<ApiResponse<PaymentSummaryInterpreter>>('/payments/my-summary');
      setSummary(s.data);
      if (tab === 'PENDING') {
        // Fetch both PENDING and PROCESSING for the "Pendientes" tab
        const pending = await api.get<PaginatedResponse<Payment>>('/payments?page=1&limit=50&status=PENDING');
        const processing = await api.get<PaginatedResponse<Payment>>('/payments?page=1&limit=50&status=PROCESSING');
        setPayments([...pending.data, ...processing.data]);
      } else {
        const p = await api.get<PaginatedResponse<Payment>>(`/payments?page=1&limit=50&status=${tab}`);
        setPayments(p.data);
      }
    } catch { /* */ }
    setLoading(false);
  }, [tab]);

  const { socket } = useSocketContext();

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!socket) return;
    const handlePaymentUpdate = () => { fetchData(); };
    socket.on('payment:completed', handlePaymentUpdate);
    socket.on('payment:approved', handlePaymentUpdate);
    socket.on('payment:adjusted', handlePaymentUpdate);
    return () => {
      socket.off('payment:completed', handlePaymentUpdate);
      socket.off('payment:approved', handlePaymentUpdate);
      socket.off('payment:adjusted', handlePaymentUpdate);
    };
  }, [socket, fetchData]);

  async function handleConfirm(id: string) {
    setConfirming(id);
    try {
      await api.patch(`/payments/${id}/confirm`, {});
      toast.success('Pago confirmado');
      fetchData();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    setConfirming(null);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-redin-earth-900">Mis pagos</h1>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {!summary ? (
          Array.from({ length: 3 }).map((_, i) => <StatsCardSkeleton key={i} />)
        ) : (
          <>
            <StatsCard title="Total ganado" value={formatCurrency(summary.totalEarnings)} icon={CreditCard} accentColor="green" />
            <StatsCard title="Ganado este mes" value={formatCurrency(summary.earningsThisMonth)} icon={CreditCard} accentColor="gold" />
            <StatsCard title="Pendiente de cobro" value={formatCurrency(summary.pendingAmount)} icon={CreditCard} accentColor="amber" />
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-redin-earth-200">
        {(['PENDING', 'COMPLETED'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              tab === t ? 'border-redin-gold-400 text-redin-gold-700' : 'border-transparent text-redin-earth-500 hover:text-redin-earth-700'
            )}
          >
            {t === 'PENDING' ? 'Pendientes' : 'Cobrados'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : payments.length === 0 ? (
        <Card><div className="p-6"><EmptyState icon={CreditCard} title={tab === 'PENDING' ? 'Sin pagos pendientes' : 'Sin pagos cobrados'} /></div></Card>
      ) : tab === 'PENDING' ? (
        <div className="space-y-4">
          {payments.map((pay) => (
            <Card key={pay.id}>
              <div className="p-4 sm:p-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-redin-earth-400">{formatDateTime(pay.createdAt)}</p>
                    <p className="text-sm font-medium text-redin-earth-900">{pay.request?.institution?.user?.name}</p>
                    <p className="text-sm text-redin-earth-600">{pay.request?.variant?.language?.name}</p>
                    {pay.breakdown && <p className="text-xs text-redin-forest-600">{pay.breakdown}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-redin-gold-700">{formatCurrency(pay.amount)}</p>
                  </div>
                </div>

                {/* Status badge */}
                <div>
                  {pay.status === 'PENDING' ? (
                    <Badge variant="amber" size="sm">En revision por REDIN</Badge>
                  ) : pay.status === 'PROCESSING' ? (
                    <Badge variant="blue" size="sm">Aprobado — pago en proceso</Badge>
                  ) : null}
                </div>

                {/* Adjustment info */}
                {pay.adjustedAmount && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm space-y-1">
                    <p className="text-redin-earth-600">Monto original: <span className="line-through">{formatCurrency(pay.amount)}</span></p>
                    <p className="font-medium text-redin-earth-900">Monto ajustado: {formatCurrency(pay.adjustedAmount)}</p>
                    {pay.adjustmentReason && <p className="text-xs text-redin-earth-500">Motivo: {pay.adjustmentReason}</p>}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="p-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-redin-earth-200 text-left text-redin-earth-500">
                  <th className="pb-3 font-medium">Fecha servicio</th>
                  <th className="pb-3 font-medium">Fecha pago</th>
                  <th className="pb-3 font-medium">Institucion</th>
                  <th className="pb-3 font-medium">Duracion</th>
                  <th className="pb-3 font-medium">Monto</th>
                  <th className="pb-3 font-medium">Confirmado</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pay) => (
                  <tr key={pay.id} className="border-b border-redin-earth-100">
                    <td className="py-3">{formatDateTime(pay.createdAt)}</td>
                    <td className="py-3">{pay.paidAt ? formatDateTime(pay.paidAt) : '--'}</td>
                    <td className="py-3">{pay.request?.institution?.user?.name}</td>
                    <td className="py-3 text-xs">{pay.breakdown ?? '--'}</td>
                    <td className="py-3 font-medium">{formatCurrency(pay.amount)}</td>
                    <td className="py-3">
                      {pay.confirmedByInterpreter ? (
                        <span className="inline-flex items-center gap-1 text-redin-forest-600 text-xs"><CheckCircle className="h-4 w-4" /> Confirmado</span>
                      ) : (
                        <Button size="sm" variant="outline" loading={confirming === pay.id} onClick={() => handleConfirm(pay.id)}>
                          Confirmar
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
