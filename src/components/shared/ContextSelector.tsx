'use client';

import { Scale, Heart, Users, GraduationCap, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

const contexts = [
  { value: 'juridico', label: 'Juridico', icon: Scale },
  { value: 'medico', label: 'Medico', icon: Heart },
  { value: 'social', label: 'Social', icon: Users },
  { value: 'educativo', label: 'Educativo', icon: GraduationCap },
  { value: 'otro', label: 'Otro', icon: MoreHorizontal },
] as const;

interface ContextSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function ContextSelector({ value, onChange, error }: ContextSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-redin-earth-700 mb-2">
        Contexto de interpretacion
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {contexts.map((ctx) => (
          <button
            key={ctx.value}
            type="button"
            onClick={() => onChange(ctx.value)}
            className={cn(
              'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all text-sm',
              value === ctx.value
                ? 'border-redin-gold-400 bg-redin-gold-50 text-redin-gold-700'
                : 'border-redin-earth-200 bg-white text-redin-earth-600 hover:border-redin-earth-300'
            )}
          >
            <ctx.icon className="h-5 w-5" />
            {ctx.label}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export function contextLabel(value?: string): string {
  return contexts.find((c) => c.value === value)?.label ?? value ?? '';
}
