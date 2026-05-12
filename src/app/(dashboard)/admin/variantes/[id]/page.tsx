'use client';

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Search, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/Table';
import type {
  ApiResponse, PaginatedResponse, LanguageVariant, VariantCommunityRow,
  Community, State,
} from '@/types';

interface VariantDetail extends LanguageVariant {
  states?: { id: string; name: string }[];
}

export default function VariantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);

  const [variant, setVariant] = useState<VariantDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [communities, setCommunities] = useState<VariantCommunityRow[]>([]);
  const [comTotal, setComTotal] = useState(0);
  const [comTotalPages, setComTotalPages] = useState(1);
  const [comPage, setComPage] = useState(1);
  const [comSearch, setComSearch] = useState('');
  const [comSearchInput, setComSearchInput] = useState('');
  const [comStateFilter, setComStateFilter] = useState('');
  const [comLoading, setComLoading] = useState(true);

  const [states, setStates] = useState<State[]>([]);
  const [showLink, setShowLink] = useState(false);
  const [linking, setLinking] = useState(false);

  const fetchVariant = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<VariantDetail>>(`/variants/${id}`);
      setVariant(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
    setLoading(false);
  }, [id]);

  const fetchCommunities = useCallback(async () => {
    setComLoading(true);
    try {
      const params = new URLSearchParams();
      if (comSearch.trim()) params.set('search', comSearch.trim());
      if (comStateFilter) params.set('stateId', comStateFilter);
      params.set('page', String(comPage));
      params.set('limit', '50');
      const res = await api.get<PaginatedResponse<VariantCommunityRow>>(`/variants/${id}/communities?${params}`);
      setCommunities(res.data);
      setComTotal(res.pagination.total);
      setComTotalPages(res.pagination.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
    setComLoading(false);
  }, [id, comPage, comSearch, comStateFilter]);

  useEffect(() => {
    fetchVariant();
    api.get<ApiResponse<State[]>>('/geo/states').then((r) => setStates(r.data)).catch(() => {});
  }, [fetchVariant]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  // Debounce busqueda
  useEffect(() => {
    const t = setTimeout(() => {
      setComSearch(comSearchInput);
      setComPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [comSearchInput]);

  async function unlinkCommunity(communityId: string, communityName: string) {
    if (!confirm(`Desvincular ${communityName} de esta variante?`)) return;
    try {
      await api.delete(`/variants/${id}/communities/${communityId}`);
      toast.success('Comunidad desvinculada');
      await Promise.all([fetchVariant(), fetchCommunities()]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
  }

  const stateOptions = [
    { value: '', label: 'Todos los estados' },
    ...states.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm text-redin-earth-500 hover:text-redin-earth-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>

      {loading ? (
        <div className="h-32 bg-redin-earth-100 rounded-xl animate-pulse" />
      ) : !variant ? (
        <EmptyState
          icon={MapPin}
          title="Variante no encontrada"
          description="La variante que buscas no existe."
        />
      ) : (
        <>
          {/* Header con info de variante */}
          <Card>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-redin-earth-900">
                  {variant.name}
                </h1>
                {variant.inaliVariantNumber !== null && variant.inaliVariantNumber !== undefined && (
                  <Badge variant="gray" size="sm">INALI #{variant.inaliVariantNumber}</Badge>
                )}
              </div>
              <p className="text-sm text-redin-earth-500">
                {variant.language?.name}
                {variant.language?.alsoKnownAs && ` (${variant.language.alsoKnownAs})`}
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                {(variant.autoDenominations ?? []).map((a, i) => (
                  <Badge key={i} variant="gold" size="sm">{a}</Badge>
                ))}
                {(variant.ipaTranscriptions ?? []).map((ipa, i) => (
                  <span key={i} className="text-xs font-mono text-redin-earth-500">{ipa}</span>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-redin-earth-100">
                <div>
                  <p className="text-xs text-redin-earth-500">Comunidades</p>
                  <p className="text-2xl font-semibold text-redin-earth-900">
                    {variant._count?.communities ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-redin-earth-500">Intérpretes</p>
                  <p className="text-2xl font-semibold text-redin-earth-900">
                    {variant._count?.interpreters ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-redin-earth-500">Solicitudes históricas</p>
                  <p className="text-2xl font-semibold text-redin-earth-900">
                    {variant._count?.requests ?? 0}
                  </p>
                </div>
              </div>

              {variant.states && variant.states.length > 0 && (
                <div className="pt-3 border-t border-redin-earth-100">
                  <p className="text-xs text-redin-earth-500 mb-1">Se habla en:</p>
                  <div className="flex flex-wrap gap-1">
                    {variant.states.map((s) => (
                      <Badge key={s.id} variant="forest" size="sm">{s.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Filtros + acciones */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-redin-earth-900">
              Comunidades vinculadas
            </h2>
            <Button
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => setShowLink(true)}
            >
              Vincular comunidad
            </Button>
          </div>

          <Card>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                placeholder="Buscar comunidad, municipio..."
                value={comSearchInput}
                onChange={(e) => setComSearchInput(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
              <Select
                options={stateOptions}
                value={comStateFilter}
                onChange={(v) => { setComStateFilter(v); setComPage(1); }}
                placeholder="Filtrar por estado"
                searchable
              />
            </div>
          </Card>

          {comLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 bg-redin-earth-100 rounded animate-pulse" />
              ))}
            </div>
          ) : communities.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="Sin comunidades"
              description={
                comSearch || comStateFilter
                  ? 'No hay comunidades con esos filtros.'
                  : 'Esta variante aún no tiene comunidades vinculadas.'
              }
              actionLabel="Vincular comunidad"
              onAction={() => setShowLink(true)}
            />
          ) : (
            <>
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Comunidad</TableHead>
                      <TableHead>Municipio</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {communities.map((c) => (
                      <TableRow key={c.linkId}>
                        <TableCell>
                          <div className="font-medium text-redin-earth-900">{c.name}</div>
                          {c.altName && (
                            <div className="text-xs text-redin-earth-500">({c.altName})</div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{c.municipality.name}</TableCell>
                        <TableCell className="text-sm">{c.municipality.state.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end">
                            <button
                              onClick={() => unlinkCommunity(c.id, c.name)}
                              className="p-1.5 rounded hover:bg-red-100 text-redin-earth-400 hover:text-red-600 transition-colors"
                              aria-label="Desvincular"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>

              {comTotalPages > 1 && (
                <div className="flex items-center justify-between text-sm text-redin-earth-500">
                  <span>Página {comPage} de {comTotalPages} · {comTotal} comunidades</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={comPage <= 1} onClick={() => setComPage(comPage - 1)}>
                      Anterior
                    </Button>
                    <Button variant="outline" size="sm" disabled={comPage >= comTotalPages} onClick={() => setComPage(comPage + 1)}>
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      <LinkCommunityModal
        open={showLink}
        onClose={() => setShowLink(false)}
        variantId={id}
        states={states}
        linking={linking}
        setLinking={setLinking}
        onLinked={async () => {
          await Promise.all([fetchVariant(), fetchCommunities()]);
        }}
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Modal: buscar y vincular una comunidad existente a esta variante
// ──────────────────────────────────────────────────────────────────────────────

interface LinkModalProps {
  open: boolean;
  onClose: () => void;
  variantId: string;
  states: State[];
  linking: boolean;
  setLinking: (b: boolean) => void;
  onLinked: () => Promise<void>;
}

function LinkCommunityModal({ open, onClose, variantId, states, linking, setLinking, onLinked }: LinkModalProps) {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [results, setResults] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);

  // Debounce de busqueda
  useEffect(() => {
    if (!open) return;
    if (!search.trim() && !stateFilter) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set('search', search.trim());
        if (stateFilter) params.set('stateId', stateFilter);
        params.set('limit', '20');
        const res = await api.get<PaginatedResponse<Community>>(`/geo/communities?${params}`);
        setResults(res.data);
      } catch { /* empty */ }
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search, stateFilter, open]);

  async function link(communityId: string) {
    setLinking(true);
    try {
      await api.post(`/variants/${variantId}/communities`, { communityId });
      toast.success('Comunidad vinculada');
      await onLinked();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
    setLinking(false);
  }

  const stateOptions = [
    { value: '', label: 'Todos los estados' },
    ...states.map((s) => ({ value: s.id, label: s.name })),
  ];

  return (
    <Modal open={open} onClose={onClose} title="Vincular comunidad a esta variante" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder="Buscar comunidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
            autoFocus
          />
          <Select
            options={stateOptions}
            value={stateFilter}
            onChange={setStateFilter}
            placeholder="Estado"
            searchable
          />
        </div>

        {loading ? (
          <p className="text-sm text-redin-earth-400 text-center py-6">Buscando...</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-redin-earth-400 text-center py-6">
            {search || stateFilter ? 'Sin resultados' : 'Escribe para buscar comunidades'}
          </p>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-1">
            {results.map((c) => (
              <button
                key={c.id}
                onClick={() => link(c.id)}
                disabled={linking}
                className="w-full text-left p-3 rounded-lg border border-redin-earth-200 hover:border-redin-gold-300 hover:bg-redin-gold-50 transition-colors disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-redin-earth-900">{c.name}</div>
                    <div className="text-xs text-redin-earth-500">
                      {c.municipality?.name} · {c.municipality?.state.name}
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-redin-gold-500" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
