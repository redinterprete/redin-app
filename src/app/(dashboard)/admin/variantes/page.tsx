'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, Pencil, Trash2, ArrowRight, MapPin, Users } from 'lucide-react';
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
  ApiResponse, PaginatedResponse, IndigenousLanguage, LanguageVariant,
} from '@/types';

interface VariantForm {
  languageId: string;
  name: string;
  autoDenominations: string;  // comma-separated en UI
  ipaTranscriptions: string;
  inaliVariantNumber: string;
  region: string;
}

const emptyForm: VariantForm = {
  languageId: '',
  name: '',
  autoDenominations: '',
  ipaTranscriptions: '',
  inaliVariantNumber: '',
  region: '',
};

export default function VariantesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filtros desde URL (preserva estado al navegar)
  const languageFilter = searchParams.get('languageId') ?? '';
  const searchFilter = searchParams.get('search') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const [data, setData] = useState<LanguageVariant[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [languages, setLanguages] = useState<IndigenousLanguage[]>([]);
  const [searchInput, setSearchInput] = useState(searchFilter);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VariantForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<LanguageVariant | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Cargar lenguas (para filtro y form de creacion)
  useEffect(() => {
    api
      .get<ApiResponse<IndigenousLanguage[]>>('/languages')
      .then((res) => setLanguages(res.data))
      .catch(() => {});
  }, []);

  const fetchVariants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (languageFilter) params.set('languageId', languageFilter);
      if (searchFilter) params.set('search', searchFilter);
      params.set('page', String(page));
      params.set('limit', '25');
      const res = await api.get<PaginatedResponse<LanguageVariant>>(`/variants?${params}`);
      setData(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar variantes');
    }
    setLoading(false);
  }, [languageFilter, searchFilter, page]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  // Debounce de busqueda
  useEffect(() => {
    if (searchInput === searchFilter) return;
    const t = setTimeout(() => {
      updateUrl({ search: searchInput, page: '1' });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function updateUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    router.push(`/admin/variantes?${params}`);
  }

  const languageOptions = useMemo(
    () => [
      { value: '', label: 'Todas las lenguas' },
      ...languages.map((l) => ({ value: l.id, label: l.name })),
    ],
    [languages]
  );

  const languageOptionsForm = useMemo(
    () => languages.map((l) => ({ value: l.id, label: l.name })),
    [languages]
  );

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, languageId: languageFilter });
    setShowForm(true);
  }

  function openEdit(v: LanguageVariant) {
    setEditingId(v.id);
    setForm({
      languageId: v.languageId ?? v.language?.id ?? '',
      name: v.name,
      autoDenominations: (v.autoDenominations ?? []).join(', '),
      ipaTranscriptions: (v.ipaTranscriptions ?? []).join(', '),
      inaliVariantNumber: v.inaliVariantNumber?.toString() ?? '',
      region: v.region ?? '',
    });
    setShowForm(true);
  }

  function parseCsv(s: string): string[] {
    return s.split(',').map((x) => x.trim()).filter((x) => x.length > 0);
  }

  async function saveVariant() {
    if (!form.name.trim() || !form.languageId) {
      toast.error('Lengua y nombre son requeridos');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        languageId: form.languageId,
        name: form.name.trim(),
        autoDenominations: parseCsv(form.autoDenominations),
        ipaTranscriptions: parseCsv(form.ipaTranscriptions),
        inaliVariantNumber: form.inaliVariantNumber ? parseInt(form.inaliVariantNumber, 10) : null,
        region: form.region.trim() || null,
      };
      if (editingId) {
        // PATCH: no se permite cambiar languageId, solo el resto
        const { languageId: _omit, ...patch } = payload;
        void _omit;
        await api.patch(`/variants/${editingId}`, patch);
        toast.success('Variante actualizada');
      } else {
        await api.post('/variants', payload);
        toast.success('Variante creada');
      }
      setShowForm(false);
      await fetchVariants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    }
    setSaving(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/variants/${deleteTarget.id}`);
      toast.success('Variante eliminada');
      setDeleteTarget(null);
      await fetchVariants();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
    setDeleting(false);
  }

  const selectedLangName = languages.find((l) => l.id === languageFilter)?.name;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-redin-earth-900">Variantes lingüísticas</h1>
          <p className="text-sm text-redin-earth-500 mt-1">
            {selectedLangName ? `Variantes de ${selectedLangName}` : 'Todas las variantes del catálogo INALI'}
            {' · '}
            <span className="font-medium">{total}</span> resultados
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          Nueva variante
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Lengua"
            options={languageOptions}
            value={languageFilter}
            onChange={(v) => updateUrl({ languageId: v || null, page: '1' })}
            searchable
          />
          <Input
            label="Buscar variante"
            placeholder="Por nombre o autodenominación..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-redin-earth-100 rounded animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Sin variantes"
          description={
            searchFilter || languageFilter
              ? 'Prueba con otros filtros.'
              : 'Agrega variantes al catálogo.'
          }
          actionLabel="Nueva variante"
          onAction={openCreate}
        />
      ) : (
        <>
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Lengua / Variante</TableHead>
                  <TableHead>Autodenominación</TableHead>
                  <TableHead className="text-right">Comunidades</TableHead>
                  <TableHead className="text-right">Intérpretes</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      {v.inaliVariantNumber !== null && v.inaliVariantNumber !== undefined && (
                        <Badge variant="gray" size="sm">#{v.inaliVariantNumber}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-redin-earth-900">{v.name}</div>
                      <div className="text-xs text-redin-earth-500">{v.language?.name}</div>
                    </TableCell>
                    <TableCell className="text-xs text-redin-earth-600">
                      {(v.autoDenominations ?? []).slice(0, 2).join(', ')}
                      {(v.autoDenominations?.length ?? 0) > 2 && (
                        <span className="text-redin-earth-400"> +{(v.autoDenominations?.length ?? 0) - 2}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-mono">{v._count?.communities ?? 0}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm font-mono inline-flex items-center gap-1">
                        <Users className="h-3 w-3 text-redin-earth-400" />
                        {v._count?.interpreters ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => router.push(`/admin/variantes/${v.id}`)}
                          className="p-1.5 rounded hover:bg-redin-earth-100 text-redin-earth-400 hover:text-redin-earth-700 transition-colors"
                          aria-label="Ver detalle"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(v)}
                          className="p-1.5 rounded hover:bg-redin-earth-100 text-redin-earth-400 hover:text-redin-earth-700 transition-colors"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {(v._count?.interpreters ?? 0) === 0 && (v._count?.requests ?? 0) === 0 && (
                          <button
                            onClick={() => setDeleteTarget(v)}
                            className="p-1.5 rounded hover:bg-red-100 text-redin-earth-400 hover:text-red-600 transition-colors"
                            aria-label="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Paginacion */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-redin-earth-500">
              <span>Página {page} de {totalPages} · {total} variantes</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => updateUrl({ page: String(page - 1) })}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => updateUrl({ page: String(page + 1) })}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Crear/editar modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Editar variante' : 'Nueva variante'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={saveVariant} loading={saving}>
              {editingId ? 'Guardar cambios' : 'Crear variante'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Lengua *"
            options={languageOptionsForm}
            value={form.languageId}
            onChange={(v) => setForm({ ...form, languageId: v })}
            placeholder="Selecciona una lengua"
            searchable
            disabled={!!editingId}  // No se puede mover de lengua via edit
          />
          <Input
            label="Nombre en español *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder='Ej. "zapoteco de Texmelucan"'
            required
          />
          <Input
            label="Autodenominaciones"
            value={form.autoDenominations}
            onChange={(e) => setForm({ ...form, autoDenominations: e.target.value })}
            placeholder="Separadas por coma. Ej. rixhquei, rixhkei"
          />
          <Input
            label="Transcripciones IPA"
            value={form.ipaTranscriptions}
            onChange={(e) => setForm({ ...form, ipaTranscriptions: e.target.value })}
            placeholder="Separadas por coma. Ej. [ɾiʃkei]"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="# INALI"
              type="number"
              min={1}
              value={form.inaliVariantNumber}
              onChange={(e) => setForm({ ...form, inaliVariantNumber: e.target.value })}
              placeholder="Ej. 1"
            />
            <Input
              label="Región (informativo)"
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              placeholder="Opcional"
            />
          </div>
        </div>
      </Modal>

      {/* Eliminar modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar variante"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button
              onClick={confirmDelete}
              loading={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Eliminar
            </Button>
          </>
        }
      >
        {deleteTarget && (
          <p className="text-sm text-redin-earth-700">
            ¿Eliminar <strong>{deleteTarget.name}</strong>? Sus vínculos a comunidades también se eliminarán.
          </p>
        )}
      </Modal>
    </div>
  );
}
