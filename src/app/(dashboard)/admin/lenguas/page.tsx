'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, ChevronDown, ChevronRight, Languages, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import type { ApiResponse, LanguageWithVariants } from '@/types';

export default function LanguagesPage() {
  const [languages, setLanguages] = useState<LanguageWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showNewLang, setShowNewLang] = useState(false);
  const [showNewVariant, setShowNewVariant] = useState<string | null>(null);
  const [langForm, setLangForm] = useState({ name: '', isoCode: '', family: '' });
  const [variantForm, setVariantForm] = useState({ name: '', region: '', inaliCode: '' });
  const [saving, setSaving] = useState(false);

  async function fetchLanguages() {
    try {
      const res = await api.get<ApiResponse<LanguageWithVariants[]>>('/languages');
      setLanguages(res.data);
    } catch { /* empty */ }
    setLoading(false);
  }

  useEffect(() => { fetchLanguages(); }, []);

  const filtered = languages.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase())
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createLanguage() {
    setSaving(true);
    try {
      await api.post('/languages', {
        name: langForm.name,
        ...(langForm.isoCode && { isoCode: langForm.isoCode }),
        ...(langForm.family && { family: langForm.family }),
      });
      setShowNewLang(false);
      setLangForm({ name: '', isoCode: '', family: '' });
      await fetchLanguages();
    } catch { /* empty */ }
    setSaving(false);
  }

  async function createVariant() {
    if (!showNewVariant) return;
    setSaving(true);
    try {
      await api.post(`/languages/${showNewVariant}/variants`, {
        name: variantForm.name,
        ...(variantForm.region && { region: variantForm.region }),
        ...(variantForm.inaliCode && { inaliCode: variantForm.inaliCode }),
      });
      setShowNewVariant(null);
      setVariantForm({ name: '', region: '', inaliCode: '' });
      await fetchLanguages();
    } catch { /* empty */ }
    setSaving(false);
  }

  async function deleteVariant(variantId: string) {
    try {
      await api.delete(`/languages/variants/${variantId}`);
      await fetchLanguages();
    } catch { /* empty */ }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-redin-earth-900">
          Catálogo de lenguas
        </h1>
        <Button
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => setShowNewLang(true)}
        >
          Nueva lengua
        </Button>
      </div>

      <div className="max-w-sm">
        <Input
          placeholder="Buscar lengua..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="h-4 w-4" />}
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-redin-earth-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Languages}
          title="Sin lenguas"
          description="No se encontraron lenguas en el catálogo."
          actionLabel="Agregar lengua"
          onAction={() => setShowNewLang(true)}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((lang) => {
            const isExpanded = expanded.has(lang.id);
            const totalInterpreters = lang.variants.reduce(
              (sum, v) => sum + v._count.interpreters, 0
            );

            return (
              <Card key={lang.id}>
                <button
                  onClick={() => toggleExpand(lang.id)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-redin-earth-400" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-redin-earth-400" />
                    )}
                    <div>
                      <h3 className="font-semibold text-redin-earth-900">
                        {lang.name}
                      </h3>
                      {lang.family && (
                        <p className="text-xs text-redin-earth-500">{lang.family}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="gold" size="sm">
                      {lang.variants.length} variantes
                    </Badge>
                    <Badge variant="forest" size="sm">
                      {totalInterpreters} intérpretes
                    </Badge>
                  </div>
                </button>

                {isExpanded && (
                  <div className="mt-4 ml-8 space-y-2">
                    {lang.variants.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between py-2 px-3 bg-redin-earth-50 rounded-lg text-sm"
                      >
                        <div>
                          <span className="font-medium text-redin-earth-700">
                            {v.name}
                          </span>
                          {v.region && (
                            <span className="text-redin-earth-400 ml-2">
                              — {v.region}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-redin-earth-500">
                            {v._count.interpreters} intérpretes
                          </span>
                          {v._count.interpreters === 0 && (
                            <button
                              onClick={() => deleteVariant(v.id)}
                              className="p-1 rounded hover:bg-red-100 text-redin-earth-400 hover:text-red-600 transition-colors"
                              aria-label="Eliminar variante"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                      onClick={() => setShowNewVariant(lang.id)}
                    >
                      Agregar variante
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* New language modal */}
      <Modal
        open={showNewLang}
        onClose={() => setShowNewLang(false)}
        title="Nueva lengua"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowNewLang(false)}>
              Cancelar
            </Button>
            <Button onClick={createLanguage} loading={saving} disabled={!langForm.name}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={langForm.name}
            onChange={(e) => setLangForm({ ...langForm, name: e.target.value })}
            required
          />
          <Input
            label="Código ISO"
            value={langForm.isoCode}
            onChange={(e) => setLangForm({ ...langForm, isoCode: e.target.value })}
          />
          <Input
            label="Familia lingüística"
            value={langForm.family}
            onChange={(e) => setLangForm({ ...langForm, family: e.target.value })}
          />
        </div>
      </Modal>

      {/* New variant modal */}
      <Modal
        open={!!showNewVariant}
        onClose={() => setShowNewVariant(null)}
        title="Nueva variante"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowNewVariant(null)}>
              Cancelar
            </Button>
            <Button onClick={createVariant} loading={saving} disabled={!variantForm.name}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={variantForm.name}
            onChange={(e) => setVariantForm({ ...variantForm, name: e.target.value })}
            required
          />
          <Input
            label="Región"
            value={variantForm.region}
            onChange={(e) => setVariantForm({ ...variantForm, region: e.target.value })}
          />
          <Input
            label="Código INALI"
            value={variantForm.inaliCode}
            onChange={(e) => setVariantForm({ ...variantForm, inaliCode: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
