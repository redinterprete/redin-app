'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Plus, Pencil, Trash2, MapPin } from 'lucide-react';
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
  ApiResponse, PaginatedResponse, Community, State, Municipality, IndigenousLanguage,
} from '@/types';

interface CommunityForm {
  municipalityId: string;
  name: string;
  altName: string;
}

const emptyForm: CommunityForm = { municipalityId: '', name: '', altName: '' };

export default function ComunidadesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Filtros desde URL
  const searchFilter = searchParams.get('search') ?? '';
  const stateFilter = searchParams.get('stateId') ?? '';
  const muniFilter = searchParams.get('municipalityId') ?? '';
  const langFilter = searchParams.get('languageId') ?? '';
  const page = parseInt(searchParams.get('page') ?? '1', 10);

  const [data, setData] = useState<Community[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [states, setStates] = useState<State[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [languages, setLanguages] = useState<IndigenousLanguage[]>([]);

  const [searchInput, setSearchInput] = useState(searchFilter);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CommunityForm>(emptyForm);
  const [formStateId, setFormStateId] = useState<string>('');
  const [formMunicipalities, setFormMunicipalities] = useState<Municipality[]>([]);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Community | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Carga inicial de catalogos
  useEffect(() => {
    api.get<ApiResponse<State[]>>('/geo/states').then((r) => setStates(r.data)).catch(() => {});
    api.get<ApiResponse<IndigenousLanguage[]>>('/languages').then((r) => setLanguages(r.data)).catch(() => {});
  }, []);

  // Cargar municipios cuando cambia stateFilter
  useEffect(() => {
    if (!stateFilter) {
      setMunicipalities([]);
      return;
    }
    api
      .get<PaginatedResponse<Municipality>>(`/geo/municipalities?stateId=${stateFilter}&limit=200`)
      .then((r) => setMunicipalities(r.data))
      .catch(() => {});
  }, [stateFilter]);

  // Cargar municipios del form cuando cambia formStateId
  useEffect(() => {
    if (!formStateId) {
      setFormMunicipalities([]);
      return;
    }
    api
      .get<PaginatedResponse<Municipality>>(`/geo/municipalities?stateId=${formStateId}&limit=200`)
      .then((r) => setFormMunicipalities(r.data))
      .catch(() => {});
  }, [formStateId]);

  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchFilter) params.set('search', searchFilter);
      if (stateFilter) params.set('stateId', stateFilter);
      if (muniFilter) params.set('municipalityId', muniFilter);
      if (langFilter) params.set('languageId', langFilter);
      params.set('page', String(page));
      params.set('limit', '50');
      const res = await api.get<PaginatedResponse<Community>>(`/geo/communities?${params}`);
      setData(res.data);
      setTotal(res.pagination.total);
      setTotalPages(res.pagination.totalPages);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
    setLoading(false);
  }, [searchFilter, stateFilter, muniFilter, langFilter, page]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  // Debounce busqueda
  useEffect(() => {
    if (searchInput === searchFilter) return;
    const t = setTimeout(() => updateUrl({ search: searchInput, page: '1' }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  function updateUrl(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    }
    router.push(`/admin/comunidades?${params}`);
  }

  const stateOptions = useMemo(
    () => [{ value: '', label: 'Todos los estados' }, ...states.map((s) => ({ value: s.id, label: s.name }))],
    [states]
  );

  const muniOptions = useMemo(
    () => [{ value: '', label: 'Todos los municipios' }, ...municipalities.map((m) => ({ value: m.id, label: m.name }))],
    [municipalities]
  );

  const langOptions = useMemo(
    () => [{ value: '', label: 'Todas las lenguas' }, ...languages.map((l) => ({ value: l.id, label: l.name }))],
    [languages]
  );

  const formMuniOptions = useMemo(
    () => formMunicipalities.map((m) => ({ value: m.id, label: m.name })),
    [formMunicipalities]
  );

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm, municipalityId: muniFilter });
    setFormStateId(stateFilter);
    setShowForm(true);
  }

  function openEdit(c: Community) {
    setEditingId(c.id);
    setForm({
      municipalityId: c.municipality?.id ?? '',
      name: c.name,
      altName: c.altName ?? '',
    });
    setFormStateId(c.municipality?.state.id ?? '');
    setShowForm(true);
  }

  async function saveCommunity() {
    if (!form.name.trim() || !form.municipalityId) {
      toast.error('Municipio y nombre son requeridos');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        municipalityId: form.municipalityId,
        name: form.name.trim(),
        altName: form.altName.trim() || null,
      };
      if (editingId) {
        const { municipalityId: _omit, ...patch } = payload;
        void _omit;
        await api.patch(`/geo/communities/${editingId}`, patch);
        toast.success('Comunidad actualizada');
      } else {
        await api.post('/geo/communities', payload);
        toast.success('Comunidad creada');
      }
      setShowForm(false);
      await fetchCommunities();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
    setSaving(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/geo/communities/${deleteTarget.id}`);
      toast.success('Comunidad eliminada');
      setDeleteTarget(null);
      await fetchCommunities();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    }
    setDeleting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-redin-earth-900">Comunidades</h1>
          <p className="text-sm text-redin-earth-500 mt-1">
            <span className="font-medium">{total}</span> comunidades en el catálogo
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          Nueva comunidad
        </Button>
      </div>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            label="Buscar"
            placeholder="Por nombre..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
          <Select
            label="Estado"
            options={stateOptions}
            value={stateFilter}
            onChange={(v) => updateUrl({ stateId: v || null, municipalityId: null, page: '1' })}
            searchable
          />
          <Select
            label="Municipio"
            options={muniOptions}
            value={muniFilter}
            onChange={(v) => updateUrl({ municipalityId: v || null, page: '1' })}
            disabled={!stateFilter}
            searchable
          />
          <Select
            label="Lengua que se habla"
            options={langOptions}
            value={langFilter}
            onChange={(v) => updateUrl({ languageId: v || null, page: '1' })}
            searchable
          />
        </div>
      </Card>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-10 bg-redin-earth-100 rounded animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Sin comunidades"
          description="No hay comunidades con esos filtros."
          actionLabel="Nueva comunidad"
          onAction={openCreate}
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
                  <TableHead className="text-right">Variantes</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="font-medium text-redin-earth-900">{c.name}</div>
                      {c.altName && (
                        <div className="text-xs text-redin-earth-500">({c.altName})</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{c.municipality?.name ?? '—'}</TableCell>
                    <TableCell className="text-sm">{c.municipality?.state.name ?? '—'}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={(c._count?.variantCommunities ?? 0) > 0 ? 'forest' : 'gray'} size="sm">
                        {c._count?.variantCommunities ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded hover:bg-redin-earth-100 text-redin-earth-400 hover:text-redin-earth-700 transition-colors"
                          aria-label="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="p-1.5 rounded hover:bg-red-100 text-redin-earth-400 hover:text-red-600 transition-colors"
                          aria-label="Eliminar"
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

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-redin-earth-500">
              <span>Página {page} de {totalPages} · {total} comunidades</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateUrl({ page: String(page - 1) })}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateUrl({ page: String(page + 1) })}>
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
        title={editingId ? 'Editar comunidad' : 'Nueva comunidad'}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={saveCommunity} loading={saving}>
              {editingId ? 'Guardar' : 'Crear comunidad'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Estado *"
            options={stateOptions}
            value={formStateId}
            onChange={(v) => { setFormStateId(v); setForm({ ...form, municipalityId: '' }); }}
            placeholder="Selecciona un estado"
            searchable
            disabled={!!editingId}
          />
          <Select
            label="Municipio *"
            options={formMuniOptions}
            value={form.municipalityId}
            onChange={(v) => setForm({ ...form, municipalityId: v })}
            placeholder={formStateId ? 'Selecciona un municipio' : 'Primero selecciona estado'}
            searchable
            disabled={!formStateId || !!editingId}
          />
          <Input
            label="Nombre *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder='Ej. "Benito Juárez"'
            required
          />
          <Input
            label="Nombre alterno"
            value={form.altName}
            onChange={(e) => setForm({ ...form, altName: e.target.value })}
            placeholder='Opcional. Ej. "La Barra" si la comunidad se conoce también así'
          />
        </div>
      </Modal>

      {/* Eliminar modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar comunidad"
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
          <div className="space-y-2 text-sm text-redin-earth-700">
            <p>¿Eliminar <strong>{deleteTarget.name}</strong>?</p>
            {(deleteTarget._count?.variantCommunities ?? 0) > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                Esta comunidad está vinculada a {deleteTarget._count?.variantCommunities} variantes. Los vínculos se eliminarán en cascada.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
