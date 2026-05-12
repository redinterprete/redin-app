'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Search, MapPin, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import type { PaginatedResponse, Community } from '@/types';

interface AsyncCommunitySearchProps {
  /** Lengua filtro — restringe a comunidades que hablan esta lengua */
  languageId: string;
  /** Estado filtro — restringe a comunidades dentro de este estado */
  stateId: string;
  /** valor seleccionado (communityId) */
  value: string;
  onChange: (communityId: string, community: Community | null) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Combobox con busqueda en servidor para el catalogo de comunidades.
 *
 * Por que no usar el Select normal: una combinacion como (Zapoteco, Oaxaca)
 * tiene 2,131 comunidades — cargar todas en el dropdown es terrible UX y un
 * payload de medio MB. Este componente hace GET `/geo/communities?search=...`
 * con debounce 300ms, asi el backend filtra y solo manda 20 resultados.
 *
 * UX:
 *   - Input principal con icono.
 *   - Al focus abre dropdown mostrando las primeras 20 comunidades de la
 *     combinacion (sin search).
 *   - Mientras se escribe (300ms debounce) el backend filtra por nombre.
 *   - Click en una la selecciona, cierra el dropdown.
 *   - Si el valor recibido por props no esta cargado, busca su detalle
 *     para mostrar el nombre.
 */
export function AsyncCommunitySearch({
  languageId,
  stateId,
  value,
  onChange,
  label,
  error,
  disabled,
  placeholder = 'Buscar comunidad...',
}: AsyncCommunitySearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Community | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── Click outside cierra el dropdown ────────────────────────────────────
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // ── Reset cuando cambia lengua o estado ─────────────────────────────────
  useEffect(() => {
    setSearch('');
    setSelected(null);
  }, [languageId, stateId]);

  // ── Cargar el detalle del value (si viene preseleccionado externamente) ─
  // Solo si el value cambia y NO coincide con el selected actual.
  useEffect(() => {
    if (!value || (selected && selected.id === value)) return;
    api.get<{ data: Community }>(`/geo/communities/${value}`)
      .then((r) => setSelected(r.data))
      .catch(() => {});
  }, [value, selected]);

  // ── Busqueda server-side con debounce ───────────────────────────────────
  const fetchResults = useCallback(async (q: string) => {
    if (!languageId || !stateId) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        languageId,
        stateId,
        limit: '20',
      });
      if (q.trim()) params.set('search', q.trim());
      const res = await api.get<PaginatedResponse<Community>>(`/geo/communities?${params}`);
      setResults(res.data);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, [languageId, stateId]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => fetchResults(search), 300);
    return () => clearTimeout(t);
  }, [search, isOpen, fetchResults]);

  function handleSelect(c: Community) {
    setSelected(c);
    onChange(c.id, c);
    setIsOpen(false);
    setSearch('');
  }

  // ── Render ──────────────────────────────────────────────────────────────
  const displayLabel = selected
    ? selected.altName
      ? `${selected.name} (${selected.altName}) — ${selected.municipality?.name ?? ''}`
      : `${selected.name} — ${selected.municipality?.name ?? ''}`
    : '';

  return (
    <div className="space-y-1" ref={wrapperRef}>
      {label && (
        <label className="block text-sm font-medium text-redin-earth-700">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between rounded-lg border bg-white px-3 py-2 text-left text-sm transition-colors',
            error ? 'border-red-400 focus:border-red-500' : 'border-redin-earth-200 focus:border-redin-gold-400',
            'focus:ring-2 focus:ring-redin-gold-100 focus:outline-none',
            disabled && 'bg-redin-earth-50 cursor-not-allowed opacity-60'
          )}
        >
          <span className={cn('truncate', !displayLabel && 'text-redin-earth-400')}>
            {displayLabel || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 text-redin-earth-400 shrink-0" />
        </button>

        {isOpen && !disabled && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-redin-earth-200 bg-white shadow-lg">
            {/* Search input */}
            <div className="p-2 border-b border-redin-earth-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-redin-earth-400" />
                <input
                  type="text"
                  placeholder="Escribe para buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded border border-redin-earth-200 pl-7 pr-2 py-1.5 text-sm focus:outline-none focus:border-redin-gold-400"
                  autoFocus
                />
                {loading && (
                  <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-redin-earth-400 animate-spin" />
                )}
              </div>
            </div>

            {/* Results */}
            <div className="max-h-64 overflow-y-auto py-1">
              {loading && results.length === 0 ? (
                <div className="px-3 py-4 text-sm text-redin-earth-400 text-center">
                  Buscando...
                </div>
              ) : results.length === 0 ? (
                <div className="px-3 py-4 text-sm text-redin-earth-400 text-center">
                  {search.trim()
                    ? `Sin resultados para "${search.trim()}"`
                    : 'No hay comunidades disponibles'}
                </div>
              ) : (
                <>
                  {results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelect(c)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-redin-earth-50 transition-colors flex items-start gap-2',
                        c.id === value && 'bg-redin-gold-50 text-redin-gold-700 font-medium'
                      )}
                    >
                      <MapPin className="h-3.5 w-3.5 mt-0.5 text-redin-earth-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate">
                          {c.name}
                          {c.altName && (
                            <span className="text-redin-earth-400 ml-1">({c.altName})</span>
                          )}
                        </div>
                        <div className="text-xs text-redin-earth-500 truncate">
                          {c.municipality?.name ?? ''}
                          {c.municipality?.state?.name && ` · ${c.municipality.state.name}`}
                        </div>
                      </div>
                    </button>
                  ))}
                  {!search.trim() && results.length >= 20 && (
                    <div className="px-3 py-2 text-xs text-redin-earth-400 text-center border-t border-redin-earth-100 mt-1">
                      Mostrando primeras 20. Escribe para buscar más específicamente.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
