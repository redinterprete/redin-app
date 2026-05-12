'use client';

import { useState, useEffect } from 'react';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import type {
  ApiResponse,
  PaginatedResponse,
  IndigenousLanguage,
  LanguageVariant,
} from '@/types';

interface LanguageSelectorProps {
  value: string; // variantId
  onChange: (variantId: string) => void;
  label?: string;
  error?: string;
}

/**
 * Selector en cascada: primero lengua, luego variante.
 *
 * Implementacion eficiente:
 *   1. Carga las 22 lenguas (ligero — sin variantes eager).
 *   2. Cuando el usuario selecciona una lengua, hace GET /variants?languageId=...
 *      con paginacion al alto (limit=200) — suficiente para cualquier lengua del
 *      catalogo (max 81 variantes en Mixteco).
 *   3. Si `value` ya tiene un variantId preseleccionado, busca su lengua y
 *      precarga las variantes.
 */
export function LanguageSelector({
  value,
  onChange,
  label = 'Lengua y variante',
  error,
}: LanguageSelectorProps) {
  const [languages, setLanguages] = useState<IndigenousLanguage[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState('');
  const [variants, setVariants] = useState<LanguageVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);

  // Cargar lenguas
  useEffect(() => {
    api
      .get<ApiResponse<IndigenousLanguage[]>>('/languages')
      .then((res) => setLanguages(res.data))
      .catch(() => {});
  }, []);

  // Si trae un value (variantId), buscar su lengua y precargar las variantes
  useEffect(() => {
    if (!value || selectedLanguageId) return;
    // Resolvemos la lengua via GET /variants/:id que retorna { language: {...} }
    api
      .get<ApiResponse<LanguageVariant>>(`/variants/${value}`)
      .then((res) => {
        if (res.data.language?.id) setSelectedLanguageId(res.data.language.id);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Cargar variantes de la lengua seleccionada
  useEffect(() => {
    if (!selectedLanguageId) {
      setVariants([]);
      return;
    }
    setVariantsLoading(true);
    api
      .get<PaginatedResponse<LanguageVariant>>(`/variants?languageId=${selectedLanguageId}&limit=100`)
      .then((res) => setVariants(res.data))
      .catch(() => setVariants([]))
      .finally(() => setVariantsLoading(false));
  }, [selectedLanguageId]);

  const langOptions = languages.map((l) => ({
    value: l.id,
    label: l.alsoKnownAs ? `${l.name} (${l.alsoKnownAs})` : l.name,
  }));

  const variantOptions = variants.map((v) => ({
    value: v.id,
    label: v.inaliVariantNumber !== null && v.inaliVariantNumber !== undefined
      ? `#${v.inaliVariantNumber} — ${v.name}`
      : v.name,
  }));

  return (
    <div className="space-y-3">
      <Select
        label={label}
        options={langOptions}
        value={selectedLanguageId}
        onChange={(id) => {
          setSelectedLanguageId(id);
          onChange('');
        }}
        placeholder="Selecciona una lengua"
        searchable
      />
      {selectedLanguageId && (
        <Select
          label="Variante"
          options={variantOptions}
          value={value}
          onChange={onChange}
          placeholder={variantsLoading ? 'Cargando...' : 'Selecciona una variante'}
          error={error}
          searchable
          disabled={variantsLoading}
        />
      )}
    </div>
  );
}
