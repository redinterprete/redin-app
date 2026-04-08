'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, DollarSign, Clock, CheckCircle, CreditCard, FileText, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { formatDateTime, formatCurrency, formatDuration, cn } from '@/lib/utils';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatsCard, StatsCardSkeleton } from '@/components/ui/StatsCard';
import { Spinner } from '@/components/ui/Spinner';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/Table';
import type { PaginatedResponse, ApiResponse, Payment, PaymentSummary, PaymentReview } from '@/types';

type Tab = 'REVIEW' | 'APPROVED' | 'PAID' | 'INSTITUTION';

export default function PagosPage() {
  const [data, setData] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('REVIEW');
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Review modal state
  const [reviewPaymentId, setReviewPaymentId] = useState<string | null>(null);
  const [review, setReview] = useState<PaymentReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustedAmount, setAdjustedAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [showClabe, setShowClabe] = useState(false);

  // Confirm mark-paid modal
  const [markPaidPayment, setMarkPaidPayment] = useState<Payment | null>(null);

  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await api.get<ApiResponse<PaymentSummary>>('/payments/summary');
      setSummary(res.data);
    } catch { /* */ }
    setSummaryLoading(false);
  }, []);

  const fetchData = useCallback(async (page: number, currentTab: Tab, q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (currentTab === 'REVIEW') params.set('status', 'PENDING');
      else if (currentTab === 'APPROVED') params.set('status', 'PROCESSING');
      else if (currentTab === 'PAID') params.set('status', 'COMPLETED');
      // INSTITUTION tab shows all payments (we filter by institutionPaymentStatus client-side)
      if (q) params.set('search', q);
      const res = await api.get<PaginatedResponse<Payment>>(`/payments?${params}`);
      setData(res.data);
      setPagination({ page: res.pagination.page, totalPages: res.pagination.totalPages, total: res.pagination.total });
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function loadAll() {
      await fetchSummary();
      await fetchData(1, tab, search);
    }
    loadAll();
  }, [fetchSummary, fetchData, tab, search]);

  // Open review modal
  async function openReview(paymentId: string) {
    setReviewPaymentId(paymentId);
    setReviewLoading(true);
    setReview(null);
    setAdminNotes('');
    setShowAdjust(false);
    setShowClabe(false);
    try {
      const res = await api.get<ApiResponse<PaymentReview>>(`/payments/${paymentId}/review`);
      setReview(res.data);
      setAdminNotes(res.data.payment.adminNotes ?? '');
    } catch (err) { toast.error('Error al cargar detalle'); setReviewPaymentId(null); }
    setReviewLoading(false);
  }

  async function handleApprovePayment() {
    if (!reviewPaymentId) return;
    setSaving(true);
    try {
      await api.patch(`/payments/${reviewPaymentId}/approve`, { adminNotes: adminNotes || undefined });
      toast.success('Pago aprobado');
      setReviewPaymentId(null);
      fetchSummary();
      fetchData(1, tab, search);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  }

  async function handleAdjustPayment() {
    if (!reviewPaymentId || !adjustmentReason) { toast.error('Motivo del ajuste requerido'); return; }
    if (adjustedAmount <= 0) { toast.error('Monto debe ser mayor a 0'); return; }
    setSaving(true);
    try {
      await api.patch(`/payments/${reviewPaymentId}/adjust`, { adjustedAmount, adjustmentReason, adminNotes: adminNotes || undefined });
      toast.success('Pago ajustado y aprobado');
      setReviewPaymentId(null);
      fetchSummary();
      fetchData(1, tab, search);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  }

  async function handleMarkPaid() {
    if (!markPaidPayment) return;
    setSaving(true);
    try {
      await api.patch(`/payments/${markPaidPayment.id}/mark-paid`, {});
      toast.success('Pago marcado como completado');
      setMarkPaidPayment(null);
      fetchSummary();
      fetchData(1, tab, search);
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
    setSaving(false);
  }

  async function handleInvoice(id: string) {
    try {
      await api.patch(`/payments/${id}/invoice-institution`, {});
      toast.success('Marcado como facturado');
      fetchData(1, tab, search);
      fetchSummary();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
  }

  async function handleCollect(id: string) {
    try {
      await api.patch(`/payments/${id}/collect-institution`, {});
      toast.success('Marcado como cobrado');
      fetchData(1, tab, search);
      fetchSummary();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Error'); }
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'REVIEW', label: 'Por revisar' },
    { value: 'APPROVED', label: 'Aprobados' },
    { value: 'PAID', label: 'Pagados' },
    { value: 'INSTITUTION', label: 'Cobros institucion' },
  ];

  const instBadge: Record<string, { variant: 'amber' | 'blue' | 'green'; label: string }> = {
    PENDING: { variant: 'amber', label: 'Pendiente de facturar' },
    INVOICED: { variant: 'blue', label: 'Facturada' },
    COLLECTED: { variant: 'green', label: 'Cobrado' },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-redin-earth-900">Pagos</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatsCardSkeleton key={i} />)
        ) : summary ? (
          <>
            <StatsCard title="Por revisar" value={`${summary.pendingReview.count} — ${formatCurrency(summary.pendingReview.total)}`} icon={Clock} accentColor="amber" />
            <StatsCard title="En proceso" value={`${summary.approved.count} — ${formatCurrency(summary.approved.total)}`} icon={CreditCard} accentColor="blue" />
            <StatsCard title="Pagado este mes" value={formatCurrency(summary.paidThisMonth.total)} icon={CheckCircle} accentColor="green" />
            <StatsCard title="Cobro pendiente inst." value={formatCurrency(summary.pendingCollection.total)} icon={Receipt} accentColor="gold" />
          </>
        ) : null}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-redin-earth-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              tab === t.value ? 'border-redin-gold-400 text-redin-gold-600' : 'border-transparent text-redin-earth-500 hover:text-redin-earth-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="max-w-sm">
        <Input placeholder="Buscar por interprete..." value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="h-4 w-4" />} />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : data.length === 0 ? (
        <Card><div className="p-6"><EmptyState icon={DollarSign} title="Sin pagos" description="No hay pagos con los filtros actuales." /></div></Card>
      ) : tab === 'REVIEW' ? (
        /* Por revisar — Cards */
        <div className="space-y-4">
          {data.map((pay) => (
            <Card key={pay.id}>
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-1 flex-1">
                    <p className="text-xs text-redin-earth-400">{formatDateTime(pay.createdAt)}</p>
                    <p className="font-medium text-redin-earth-900">{pay.interpreter.user.name}</p>
                    <p className="text-sm text-redin-earth-600">{pay.request?.institution?.user?.name}</p>
                    <p className="text-sm text-redin-earth-500">{pay.request?.variant?.language?.name} — {pay.request?.variant?.name}</p>
                    {pay.request?.durationMinutes && <p className="text-xs text-redin-earth-400">Duracion: {formatDuration(pay.request.durationMinutes)}</p>}
                    {pay.breakdown && <p className="text-xs text-redin-forest-600 mt-1">{pay.breakdown}</p>}
                  </div>
                  <div className="text-right space-y-2">
                    <p className="text-2xl font-bold text-redin-gold-700">{formatCurrency(pay.amount)}</p>
                    <Button size="sm" onClick={() => openReview(pay.id)}>Revisar y aprobar</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : tab === 'APPROVED' ? (
        /* Aprobados — Table */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Interprete</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>CLABE</TableHead>
                <TableHead>Ajuste</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((pay) => (
                <TableRow key={pay.id}>
                  <TableCell className="font-medium">{pay.interpreter.user.name}</TableCell>
                  <TableCell>
                    {pay.adjustedAmount ? (
                      <span>
                        <span className="line-through text-redin-earth-400 text-xs mr-1">{formatCurrency(pay.amount)}</span>
                        <span className="font-semibold text-redin-gold-700">{formatCurrency(pay.adjustedAmount)}</span>
                      </span>
                    ) : (
                      <span className="font-semibold">{formatCurrency(pay.amount)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{pay.bankClabe ? `...${pay.bankClabe.slice(-4)}` : '--'}</TableCell>
                  <TableCell className="text-xs">{pay.adjustmentReason ?? '--'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => setMarkPaidPayment(pay)}>Marcar pagado</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : tab === 'PAID' ? (
        /* Pagados — Table */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha pago</TableHead>
                <TableHead>Interprete</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Confirmado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((pay) => (
                <TableRow key={pay.id}>
                  <TableCell>{pay.paidAt ? formatDateTime(pay.paidAt) : '--'}</TableCell>
                  <TableCell className="font-medium">{pay.interpreter.user.name}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(pay.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={pay.confirmedByInterpreter ? 'green' : 'amber'} size="sm">
                      {pay.confirmedByInterpreter ? 'Si' : 'Pendiente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        /* Cobros institucion */
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Institucion</TableHead>
                <TableHead>Servicio</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Estado cobro</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((pay) => {
                const instStatus = pay.institutionPaymentStatus ?? 'PENDING';
                const badge = instBadge[instStatus] ?? instBadge.PENDING;
                return (
                  <TableRow key={pay.id}>
                    <TableCell className="font-medium">{pay.request?.institution?.user?.name}</TableCell>
                    <TableCell className="text-xs">{pay.request?.variant?.language?.name}</TableCell>
                    <TableCell>{formatDateTime(pay.createdAt)}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(pay.amount)}</TableCell>
                    <TableCell><Badge variant={badge.variant} size="sm">{badge.label}</Badge></TableCell>
                    <TableCell>
                      {instStatus === 'PENDING' && <Button size="sm" variant="outline" onClick={() => handleInvoice(pay.id)}>Facturar</Button>}
                      {instStatus === 'INVOICED' && <Button size="sm" variant="outline" onClick={() => handleCollect(pay.id)}>Cobrar</Button>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Pagination */}
      {data.length > 0 && (
        <div className="flex items-center justify-between text-sm text-redin-earth-500">
          <span>{pagination.total} pagos</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchData(pagination.page - 1, tab, search)}>Anterior</Button>
            <span className="px-3 py-1">Pagina {pagination.page} de {pagination.totalPages}</span>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchData(pagination.page + 1, tab, search)}>Siguiente</Button>
          </div>
        </div>
      )}

      {/* Review modal */}
      <Modal open={!!reviewPaymentId} onClose={() => setReviewPaymentId(null)} title="Revision de pago" size="lg">
        {reviewLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : review ? (
          <div className="space-y-5">
            {/* Service */}
            <div className="bg-redin-earth-50 rounded-lg p-4 space-y-1 text-sm">
              <p className="font-medium text-redin-earth-900">{review.service.language} — {review.service.variant}</p>
              {review.service.context && <p className="text-redin-earth-600 capitalize">{review.service.context}</p>}
              {review.service.description && <p className="text-redin-earth-500 text-xs">{review.service.description}</p>}
              <p className="text-redin-earth-400 text-xs">Tipo: {review.service.type === 'IMMEDIATE' ? 'Inmediata' : 'Programada'}</p>
            </div>

            {/* Timeline */}
            <div>
              <h4 className="text-sm font-medium text-redin-earth-700 mb-2">Timeline</h4>
              <div className="space-y-2">
                {review.timeline.map((evt, i) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0',
                      evt.detail === 'Tiempo descontado del facturable' ? 'bg-red-400' : 'bg-redin-forest-400'
                    )} />
                    <div>
                      <p className="text-redin-earth-700">{evt.event}</p>
                      <p className="text-redin-earth-400">{formatDateTime(evt.timestamp)}</p>
                      {evt.detail && <p className="text-redin-earth-500 italic">{evt.detail}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Billing */}
            <div className="bg-redin-gold-50 border border-redin-gold-200 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-redin-earth-600">Duracion total</span><span className="font-medium">{review.service.durationMinutes ? formatDuration(review.service.durationMinutes) : '--'}</span></div>
              {review.service.billingMinutes && review.service.billingMinutes !== review.service.durationMinutes && (
                <div className="flex justify-between"><span className="text-redin-earth-600">Duracion facturable</span><span className="font-medium">{formatDuration(review.service.billingMinutes)}</span></div>
              )}
              {review.disconnections.length > 0 && (
                <div>
                  <p className="text-redin-earth-600 mb-1">Desconexiones:</p>
                  {review.disconnections.map((d, i) => (
                    <p key={i} className={cn('text-xs ml-2', d.withinGrace ? 'text-redin-earth-400' : 'text-red-600')}>
                      {d.participant}: {Math.floor(d.durationSeconds / 60)} min {d.withinGrace ? '(gracia)' : '(descontado)'}
                    </p>
                  ))}
                </div>
              )}
              <hr className="border-redin-gold-200" />
              <div className="flex justify-between"><span className="text-redin-earth-600">Horas cobradas</span><span className="font-medium">{review.payment.billedHours ?? '--'}</span></div>
              <div className="flex justify-between"><span className="text-redin-earth-600">Tarifa</span><span className="font-medium">{formatCurrency(review.payment.hourlyRate ?? 0)}/hr</span></div>
              {review.payment.breakdown && <p className="text-xs text-redin-forest-700">{review.payment.breakdown}</p>}
              <div className="flex justify-between text-lg"><span className="font-semibold text-redin-earth-800">Monto</span><span className="font-bold text-redin-gold-700">{formatCurrency(review.payment.amount)}</span></div>
            </div>

            {/* Bank info */}
            <div className="bg-redin-earth-50 rounded-lg p-4 space-y-1 text-sm">
              <p className="font-medium text-redin-earth-900">{review.interpreter.name}</p>
              <p className="text-redin-earth-600">Banco: {review.interpreter.bankName ?? '--'}</p>
              <p className="text-redin-earth-600">
                CLABE: {showClabe ? (
                  <span className="font-mono">{review.interpreter.bankClabe ?? '--'}</span>
                ) : (
                  <span>
                    <span className="font-mono">{review.interpreter.bankClabe ? `...${review.interpreter.bankClabe.slice(-4)}` : '--'}</span>
                    {review.interpreter.bankClabe && <button className="ml-2 text-xs text-redin-gold-600 underline" onClick={() => setShowClabe(true)}>Ver completa</button>}
                  </span>
                )}
              </p>
              <p className="text-redin-earth-600">Titular: {review.interpreter.bankHolder ?? '--'}</p>
            </div>

            {/* Institution */}
            <div className="text-sm">
              <p className="font-medium text-redin-earth-900">{review.institution.name}</p>
              <p className="text-redin-earth-500">{[review.institution.type, review.institution.city].filter(Boolean).join(' | ')}</p>
            </div>

            {/* Actions */}
            <div className="border-t border-redin-earth-200 pt-4 space-y-3">
              <textarea
                placeholder="Notas internas (opcional)"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full p-3 border border-redin-earth-300 rounded-lg text-sm"
                rows={2}
              />
              <div className="flex gap-3">
                <Button className="flex-1" onClick={handleApprovePayment} loading={saving}>
                  Aprobar pago — {formatCurrency(review.payment.amount)}
                </Button>
                <Button variant="outline" onClick={() => { setShowAdjust(!showAdjust); setAdjustedAmount(review.payment.amount); }}>
                  Ajustar monto
                </Button>
              </div>

              {showAdjust && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-redin-earth-700 mb-1">Monto ajustado (MXN)</label>
                    <input
                      type="number"
                      min={1}
                      className="w-full p-3 border border-redin-earth-300 rounded-lg text-sm"
                      value={adjustedAmount}
                      onChange={(e) => setAdjustedAmount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-redin-earth-700 mb-1">Motivo del ajuste (requerido)</label>
                    <textarea
                      className="w-full p-3 border border-redin-earth-300 rounded-lg text-sm"
                      rows={2}
                      value={adjustmentReason}
                      onChange={(e) => setAdjustmentReason(e.target.value)}
                      placeholder="Ej: Ajuste por duracion corregida"
                    />
                  </div>
                  <Button onClick={handleAdjustPayment} loading={saving}>Confirmar ajuste y aprobar</Button>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Mark paid confirmation */}
      <Modal open={!!markPaidPayment} onClose={() => setMarkPaidPayment(null)} title="Confirmar pago" size="sm">
        {markPaidPayment && (
          <div className="space-y-4">
            <p className="text-sm text-redin-earth-600">Confirmas que se realizo la transferencia al interprete?</p>
            <div className="bg-redin-earth-50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-redin-earth-500">Interprete</span><span className="font-medium">{markPaidPayment.interpreter.user.name}</span></div>
              <div className="flex justify-between"><span className="text-redin-earth-500">Monto</span><span className="font-semibold">{formatCurrency(markPaidPayment.adjustedAmount ?? markPaidPayment.amount)}</span></div>
              <div className="flex justify-between"><span className="text-redin-earth-500">CLABE</span><span className="font-mono">{markPaidPayment.bankClabe ?? '--'}</span></div>
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setMarkPaidPayment(null)}>Cancelar</Button>
              <Button loading={saving} onClick={handleMarkPaid}>Confirmar pago</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
