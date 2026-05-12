'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap, CalendarClock, Sparkles, MapPin, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { LanguageSelector } from '@/components/shared/LanguageSelector';
import { ContextSelector } from '@/components/shared/ContextSelector';
import { DateTimePicker } from '@/components/shared/DateTimePicker';
import { AsyncCommunitySearch } from '@/components/shared/AsyncCommunitySearch';
import { cn } from '@/lib/utils';
import type {
  ApiResponse, ServiceRequest, IndigenousLanguage,
  State, Community,
} from '@/types';

type Mode = 'community' | 'manual';

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Modo del formulario ─────────────────────────────────────────────────
  // 'community' = nuevo flujo (lengua + estado + comunidad → sistema infiere)
  // 'manual'    = flujo original (lengua + variante manual)
  const [mode, setMode] = useState<Mode>('community');

  // ── Estado del flujo "community" ────────────────────────────────────────
  const [languages, setLanguages] = useState<IndigenousLanguage[]>([]);
  const [states, setStates] = useState<State[]>([]);

  const [languageId, setLanguageId] = useState('');
  const [stateId, setStateId] = useState('');
  const [communityId, setCommunityId] = useState('');
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);

  // ── Estado del flujo "manual" ───────────────────────────────────────────
  const [variantId, setVariantId] = useState('');

  // ── Comunes ─────────────────────────────────────────────────────────────
  const [type, setType] = useState<'IMMEDIATE' | 'SCHEDULED' | ''>('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [context, setContext] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<ServiceRequest | null>(null);
  const [showAIBanner, setShowAIBanner] = useState(false);

  // ── Carga inicial: lenguas y estados ────────────────────────────────────
  useEffect(() => {
    api.get<ApiResponse<IndigenousLanguage[]>>('/languages')
      .then((r) => setLanguages(r.data))
      .catch(() => {});
    api.get<ApiResponse<State[]>>('/geo/states')
      .then((r) => setStates(r.data))
      .catch(() => {});
  }, []);

  // Cuando cambia lengua o estado, reseteamos la comunidad seleccionada.
  // El AsyncCommunitySearch se encarga de cargar resultados server-side.
  useEffect(() => {
    setCommunityId('');
    setSelectedCommunity(null);
  }, [languageId, stateId]);

  // ── Pre-fill desde flujo de identificacion IA ───────────────────────────
  useEffect(() => {
    const qVariantId = searchParams.get('variantId');
    const qFrom = searchParams.get('from');
    if (qVariantId && qFrom === 'identification') {
      setMode('manual');
      setVariantId(qVariantId);
      setShowAIBanner(true);
    }
  }, [searchParams]);

  // ── Opciones de selects ─────────────────────────────────────────────────
  const languageOptions = useMemo(
    () => languages.map((l) => ({
      value: l.id,
      label: l.alsoKnownAs ? `${l.name} (${l.alsoKnownAs})` : l.name,
    })),
    [languages]
  );

  const stateOptions = useMemo(
    () => states.map((s) => ({ value: s.id, label: s.name })),
    [states]
  );

  // ── Validacion del submit ───────────────────────────────────────────────
  const canSubmitCommunityMode = languageId && stateId && communityId && type && context && (type !== 'SCHEDULED' || scheduledAt);
  const canSubmitManualMode    = variantId && type && context && (type !== 'SCHEDULED' || scheduledAt);
  const canSubmit = mode === 'community' ? canSubmitCommunityMode : canSubmitManualMode;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !type) return;
    setError('');
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        type,
        context,
        ...(description && { description }),
        ...(type === 'SCHEDULED' && { scheduledAt: new Date(scheduledAt).toISOString() }),
      };
      if (mode === 'community') {
        payload['languageId'] = languageId;
        payload['communityId'] = communityId;
      } else {
        payload['variantId'] = variantId;
      }
      const res = await api.post<ApiResponse<ServiceRequest>>('/requests', payload);
      setSuccess(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear la solicitud');
    }
    setSubmitting(false);
  }

  function resetForm() {
    setLanguageId('');
    setStateId('');
    setCommunityId('');
    setSelectedCommunity(null);
    setVariantId('');
    setType('');
    setScheduledAt('');
    setContext('');
    setDescription('');
    setSuccess(null);
    setError('');
  }

  const minScheduledDate = new Date();

  // Nombres seleccionados para mostrar en el preview
  const selectedLang = languages.find((l) => l.id === languageId);
  const selectedState = states.find((s) => s.id === stateId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {showAIBanner && (
        <div className="bg-redin-gold-50 border border-redin-gold-200 rounded-xl p-4 flex items-center gap-3">
          <Sparkles size={20} className="text-redin-gold-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-redin-gold-800">Lengua identificada por IA</p>
            <p className="text-xs text-redin-gold-600">Se pre-seleccionó la variante. Completa el resto del formulario.</p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-redin-earth-900">Nueva solicitud de interpretación</h1>
        <p className="text-sm text-redin-earth-500 mt-1">
          Complete la información para buscar un intérprete disponible
        </p>
      </div>

      {/* Selector de modo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode('community')}
          className={cn(
            'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
            mode === 'community'
              ? 'border-redin-gold-400 bg-redin-gold-50'
              : 'border-redin-earth-200 hover:border-redin-earth-300 bg-white'
          )}
        >
          <MapPin className={cn('h-5 w-5 shrink-0 mt-0.5', mode === 'community' ? 'text-redin-gold-600' : 'text-redin-earth-400')} />
          <div>
            <p className="font-medium text-sm text-redin-earth-900">Por comunidad (recomendado)</p>
            <p className="text-xs text-redin-earth-500 mt-1">
              Selecciona lengua, estado y comunidad. El sistema infiere la variante automáticamente.
            </p>
          </div>
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={cn(
            'flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
            mode === 'manual'
              ? 'border-redin-gold-400 bg-redin-gold-50'
              : 'border-redin-earth-200 hover:border-redin-earth-300 bg-white'
          )}
        >
          <Layers className={cn('h-5 w-5 shrink-0 mt-0.5', mode === 'manual' ? 'text-redin-gold-600' : 'text-redin-earth-400')} />
          <div>
            <p className="font-medium text-sm text-redin-earth-900">Por variante (manual)</p>
            <p className="text-xs text-redin-earth-500 mt-1">
              Si ya conoces la variante exacta, selecciónala directamente.
            </p>
          </div>
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <div className="space-y-6">
            {/* Paso 1: identificacion de la lengua */}
            <div>
              <h3 className="text-sm font-semibold text-redin-earth-700 mb-3">
                1. Identificación lingüística
              </h3>

              {mode === 'community' ? (
                <div className="space-y-3">
                  <Select
                    label="Lengua *"
                    options={languageOptions}
                    value={languageId}
                    onChange={(v) => { setLanguageId(v); setStateId(''); setCommunityId(''); }}
                    placeholder="Selecciona una lengua"
                    searchable
                  />
                  <Select
                    label="Estado *"
                    options={stateOptions}
                    value={stateId}
                    onChange={(v) => { setStateId(v); setCommunityId(''); }}
                    placeholder={languageId ? 'Selecciona el estado' : 'Primero selecciona la lengua'}
                    searchable
                    disabled={!languageId}
                  />
                  <AsyncCommunitySearch
                    label="Comunidad *"
                    languageId={languageId}
                    stateId={stateId}
                    value={communityId}
                    onChange={(id, com) => {
                      setCommunityId(id);
                      setSelectedCommunity(com);
                    }}
                    placeholder={
                      !languageId || !stateId
                        ? 'Primero selecciona lengua y estado'
                        : 'Buscar y seleccionar comunidad'
                    }
                    disabled={!languageId || !stateId}
                  />

                  {selectedCommunity && selectedLang && (
                    <div className="bg-redin-forest-50 border border-redin-forest-200 rounded-lg p-3 text-xs text-redin-forest-800">
                      <p className="font-medium">Resumen</p>
                      <p>
                        {selectedLang.name} en {selectedState?.name}, comunidad{' '}
                        <strong>{selectedCommunity.name}</strong>
                        {selectedCommunity.municipality?.name && ` (${selectedCommunity.municipality.name})`}.
                        El sistema buscará intérpretes que hablen la variante que se habla en esta comunidad.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <LanguageSelector value={variantId} onChange={setVariantId} />
              )}
            </div>

            {/* Paso 2: Tipo */}
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
                  <p className="text-xs text-redin-earth-500 mt-2">Mínimo 1 hora de anticipación</p>
                </div>
              )}
            </div>

            {/* Paso 3: Contexto */}
            <div>
              <h3 className="text-sm font-semibold text-redin-earth-700 mb-3">3. Contexto</h3>
              <ContextSelector value={context} onChange={setContext} />
              <div className="mt-3">
                <label className="block text-sm font-medium text-redin-earth-700 mb-1">
                  Descripción adicional (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Describa brevemente la situación para que el intérprete esté preparado..."
                  rows={3}
                  className="w-full rounded-lg border border-redin-earth-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-redin-gold-400 resize-none"
                />
                <p className="text-xs text-redin-earth-400 text-right">{description.length}/500</p>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
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
              ? 'Estamos buscando un intérprete disponible. Te notificaremos cuando uno acepte.'
              : 'Tu interpretación ha sido agendada. Recibirás confirmación cuando un intérprete acepte.'}
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
