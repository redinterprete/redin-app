'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Search, Plus, Languages as LanguagesIcon, Pencil, Trash2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ApiResponse, IndigenousLanguage } from '@/types';

interface LangForm {
  name: string;
  alsoKnownAs: string;
  isoCode: string;
  family: string;
}

const emptyForm: LangForm = { name: '', alsoKnownAs: '', isoCode: '', family: '' };

export default function LanguagesPage() {
  const [data, setData] = useState<IndigenousLanguage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<LangForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<IndigenousLanguage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLanguages = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('search', q.trim());
      const res = await api.get<ApiResponse<IndigenousLanguage[]>>(`/languages?${params}`);
      setData(res.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cargar lenguas');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchLanguages(search), 250);
    return () => clearTimeout(t);
  }, [fetchLanguages, search]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(lang: IndigenousLanguage) {
    setEditingId(lang.id);
    setForm({
      name: lang.name,
      alsoKnownAs: lang.alsoKnownAs ?? '',
      isoCode: lang.isoCode ?? '',
      family: lang.family ?? '',
    });
    setShowForm(true);
  }

  async function saveLanguage() {
    if (!form.name.trim()) {
      toast.error('Nombre requerido');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        alsoKnownAs: form.alsoKnownAs.trim() || null,
        isoCode: form.isoCode.trim() || null,
        family: form.family.trim() || null,
      };
      if (editingId) {
        await api.patch(`/languages/${editingId}`, payload);
        toast.success('Lengua actualizada');
      } else {
        await api.post('/languages', payload);
        toast.success('Lengua creada');
      }
      setShowForm(false);
      await fetchLanguages(search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar');
    }
    setSaving(false);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/languages/${deleteTarget.id}`);
      toast.success('Lengua eliminada');
      setDeleteTarget(null);
      await fetchLanguages(search);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar');
    }
    setDeleting(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-redin-earth-900">Lenguas</h1>
          <p className="text-sm text-redin-earth-500 mt-1">
            Catálogo de lenguas indígenas. Las variantes y comunidades se gestionan desde sus propias pantallas.
          </p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreate}>
          Nueva lengua
        </Button>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Buscar por nombre o nombre alterno..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 bg-redin-earth-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <EmptyState
          icon={LanguagesIcon}
          title={search ? 'Sin resultados' : 'Sin lenguas'}
          description={
            search ? 'Prueba con otro término de búsqueda.' : 'Agrega lenguas al catálogo.'
          }
          actionLabel="Nueva lengua"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-3">
          {data.map((lang) => (
            <Card key={lang.id} className="hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-redin-earth-900">{lang.name}</h3>
                    {lang.alsoKnownAs && (
                      <span className="text-sm text-redin-earth-500">({lang.alsoKnownAs})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-redin-earth-500">
                    {lang.family && <span>{lang.family}</span>}
                    {lang.isoCode && <span>· ISO: {lang.isoCode}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="gold" size="sm">
                    {lang._count?.variants ?? 0} variantes
                  </Badge>
                  <Link
                    href={`/admin/variantes?languageId=${lang.id}`}
                    className="text-sm text-redin-gold-600 hover:text-redin-gold-700 flex items-center gap-1"
                  >
                    Ver variantes
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => openEdit(lang)}
                    className="p-1.5 rounded hover:bg-redin-earth-100 text-redin-earth-400 hover:text-redin-earth-700 transition-colors"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {(lang._count?.variants ?? 0) === 0 && (
                    <button
                      onClick={() => setDeleteTarget(lang)}
                      className="p-1.5 rounded hover:bg-red-100 text-redin-earth-400 hover:text-red-600 transition-colors"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Crear/editar modal */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? 'Editar lengua' : 'Nueva lengua'}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={saveLanguage} loading={saving}>
              {editingId ? 'Guardar cambios' : 'Crear lengua'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej. Zapoteco"
            required
          />
          <Input
            label="Nombre alterno"
            value={form.alsoKnownAs}
            onChange={(e) => setForm({ ...form, alsoKnownAs: e.target.value })}
            placeholder="Ej. Me'phaa, Tenek (opcional)"
          />
          <Input
            label="Código ISO 639-3"
            value={form.isoCode}
            onChange={(e) => setForm({ ...form, isoCode: e.target.value })}
            placeholder="Ej. zap (opcional)"
            maxLength={10}
          />
          <Input
            label="Familia lingüística"
            value={form.family}
            onChange={(e) => setForm({ ...form, family: e.target.value })}
            placeholder="Ej. Otomangue (opcional)"
          />
        </div>
      </Modal>

      {/* Eliminar modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Eliminar lengua"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
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
            ¿Eliminar <strong>{deleteTarget.name}</strong>? Solo se puede eliminar si no tiene variantes asociadas.
          </p>
        )}
      </Modal>
    </div>
  );
}
