'use client';

import { useState, useEffect } from 'react';
import { Select } from '@/components/ui/Select';
import { api } from '@/lib/api';
import type { ApiResponse, LanguageWithVariants } from '@/types';

interface LanguageSelectorProps {
  value: string;
  onChange: (variantId: string) => void;
  label?: string;
  error?: string;
}

export function LanguageSelector({
  value,
  onChange,
  label = 'Lengua y variante',
  error,
}: LanguageSelectorProps) {
  const [languages, setLanguages] = useState<LanguageWithVariants[]>([]);
  const [selectedLanguageId, setSelectedLanguageId] = useState('');

  useEffect(() => {
    api
      .get<ApiResponse<LanguageWithVariants[]>>('/languages')
      .then((res) => setLanguages(res.data))
      .catch(() => {});
  }, []);

  // Si ya hay valor, encontrar la lengua correspondiente
  useEffect(() => {
    if (value && languages.length > 0) {
      for (const lang of languages) {
        const found = lang.variants.find((v) => v.id === value);
        if (found) {
          setSelectedLanguageId(lang.id);
          break;
        }
      }
    }
  }, [value, languages]);

  const langOptions = languages.map((l) => ({
    value: l.id,
    label: `${l.name}${l.family ? ` (${l.family})` : ''}`,
  }));

  const selectedLang = languages.find((l) => l.id === selectedLanguageId);
  const variantOptions =
    selectedLang?.variants.map((v) => ({
      value: v.id,
      label: v.name,
    })) ?? [];

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
          placeholder="Selecciona una variante"
          error={error}
          searchable
        />
      )}
    </div>
  );
}
