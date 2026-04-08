'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, CalendarClock, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LanguageSelector } from '@/components/shared/LanguageSelector';
import { ContextSelector } from '@/components/shared/ContextSelector';
import { DateTimePicker } from '@/components/shared/DateTimePicker';
import { cn } from '@/lib/utils';
import type { ApiResponse, ServiceRequest, CreateRequestPayload } from '@/types';

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [variantId, setVariantId] = useState('');
  const [type, setType] = useState<'IMMEDIATE' | 'SCHEDULED' | ''>('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [context, setContext] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<ServiceRequest | null>(null);
  const [showAIBanner, setShowAIBanner] = useState(false);

  // Pre-fill from language identification
  useEffect(() => {
    const qVariantId = searchParams.get('variantId');
    const qFrom = searchParams.get('from');
    if (qVariantId && qFrom === 'identification') {
      setVariantId(qVariantId);
      setShowAIBanner(true);
    }
  }, [searchParams]);

  const canSubmit = variantId && type && context && (!type || type !== 'SCHEDULED' || scheduledAt);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !type) return;

    setError('');
    setSubmitting(true);
    try {
      const payload: CreateRequestPayload = {
        variantId,
        type,
        context,
        description: description || undefined,
        scheduledAt: type === 'SCHEDULED' ? new Date(scheduledAt).toISOString() : undefined,
      };
      const res = await api.post<ApiResponse<ServiceRequest>>('/requests', payload as unknown as Record<string, unknown>);
      setSuccess(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la solicitud');
    }
    setSubmitting(false);
  }

  function resetForm() {
    setVariantId('');
    setType('');
    setScheduledAt('');
    setContext('');
    setDescription('');
    setSuccess(null);
    setError('');
  }

  // Min datetime for scheduled: allow current time (for testing/dev)
  const minScheduledDate = new Date();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {showAIBanner && (
        <div className="bg-redin-gold-50 border border-redin-gold-200 rounded-xl p-4 flex items-center gap-3">
          <Sparkles size={20} className="text-redin-gold-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-redin-gold-800">Lengua identificada por IA</p>
            <p className="text-xs text-redin-gold-600">Se pre-selecciono la variante detectada. Solo completa el tipo de servicio y el contexto.</p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-redin-earth-900">Nueva solicitud de interpretacion</h1>
        <p className="text-sm text-redin-earth-500 mt-1">Complete la informacion para buscar un interprete disponible</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="p-6 space-y-6">
            {/* Step 1: Language */}
            <div>
              <h3 className="text-sm font-semibold text-redin-earth-700 mb-3">1. Selecciona la lengua</h3>
              <LanguageSelector value={variantId} onChange={setVariantId} />
            </div>

            {/* Step 2: Type */}
            <div>
              <h3 className="text-sm font-semibold text-redin-earth-700 mb-3">2. Tipo de solicitud</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('IMMEDIATE')}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                    type === 'IMMEDIATE'
                      ? 'border-redin-gold-400 bg-redin-gold-50'
                      : 'border-redin-earth-200 hover:border-redin-earth-300'
                  )}
                >
                  <Zap className={cn('h-6 w-6 shrink-0', type === 'IMMEDIATE' ? 'text-redin-gold-600' : 'text-redin-earth-400')} />
                  <div>
                    <p className="font-medium text-sm text-redin-earth-900">Inmediata</p>
                    <p className="text-xs text-redin-earth-500">Conectar ahora mismo</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setType('SCHEDULED')}
                  className={cn(
                    'flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all',
                    type === 'SCHEDULED'
                      ? 'border-redin-gold-400 bg-redin-gold-50'
                      : 'border-redin-earth-200 hover:border-redin-earth-300'
                  )}
                >
                  <CalendarClock className={cn('h-6 w-6 shrink-0', type === 'SCHEDULED' ? 'text-redin-gold-600' : 'text-redin-earth-400')} />
                  <div>
                    <p className="font-medium text-sm text-redin-earth-900">Agendar</p>
                    <p className="text-xs text-redin-earth-500">Programar fecha y hora</p>
                  </div>
                </button>
              </div>
              {type === 'SCHEDULED' && (
                <div className="mt-3">
                  <DateTimePicker
                    value={scheduledAt}
                    onChange={setScheduledAt}
                    minDate={minScheduledDate}
                    label="Fecha y hora del servicio"
                  />
                  <p className="text-xs text-redin-earth-500 mt-2">Minimo 1 hora de anticipacion</p>
                </div>
              )}
            </div>

            {/* Step 3: Context */}
            <div>
              <h3 className="text-sm font-semibold text-redin-earth-700 mb-3">3. Contexto</h3>
              <ContextSelector value={context} onChange={setContext} />
              <div className="mt-3">
                <label className="block text-sm font-medium text-redin-earth-700 mb-1">Descripcion adicional (opcional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Describa brevemente la situacion para que el interprete este preparado..."
                  rows={3}
                  className="w-full rounded-lg border border-redin-earth-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-redin-gold-400 resize-none"
                />
                <p className="text-xs text-redin-earth-400 text-right">{description.length}/500</p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
            )}

            <Button type="submit" size="lg" fullWidth loading={submitting} disabled={!canSubmit}>
              Enviar solicitud
            </Button>
          </div>
        </Card>
      </form>

      {/* Success modal */}
      <Modal open={!!success} onClose={() => setSuccess(null)} title="Solicitud enviada" size="sm">
        <div className="text-center space-y-4 py-4">
          <div className="h-16 w-16 mx-auto rounded-full bg-redin-forest-100 flex items-center justify-center">
            <svg className="h-8 w-8 text-redin-forest-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-sm text-redin-earth-600">
            {success?.type === 'IMMEDIATE'
              ? 'Estamos buscando un interprete disponible. Te notificaremos cuando uno acepte.'
              : 'Tu interpretacion ha sido agendada. Recibiras confirmacion cuando un interprete acepte.'}
          </p>
        </div>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={resetForm}>Crear otra</Button>
          <Button onClick={() => router.push('/institucion/historial')}>Ver mis solicitudes</Button>
        </div>
      </Modal>
    </div>
  );
}
