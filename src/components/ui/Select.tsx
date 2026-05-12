'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  searchable?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Seleccionar...',
  label,
  error,
  searchable,
  disabled,
  className,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label || '';

  const filtered = searchable
    ? options.filter((o) =>
        o.label.toLowerCase().includes(search.toLowerCase())
      )
    : options;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={cn('space-y-1', className)} ref={ref}>
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
            'w-full flex items-center justify-between rounded-lg border border-redin-earth-200 bg-white px-3 py-2 text-left text-sm transition-colors focus:border-redin-gold-400 focus:ring-2 focus:ring-redin-gold-100 focus:outline-none',
            error && 'border-red-400',
            !selectedLabel && 'text-redin-earth-400',
            disabled && 'bg-redin-earth-50 cursor-not-allowed opacity-60'
          )}
        >
          <span className="truncate">
            {selectedLabel || placeholder}
          </span>
          <ChevronDown className="h-4 w-4 text-redin-earth-400 shrink-0" />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-redin-earth-200 bg-white shadow-lg">
            {searchable && (
              <div className="p-2 border-b border-redin-earth-100">
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded border border-redin-earth-200 px-2 py-1 text-sm focus:outline-none focus:border-redin-gold-400"
                  autoFocus
                />
              </div>
            )}
            <div className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <div className="px-3 py-2 text-sm text-redin-earth-400">
                  Sin resultados
                </div>
              ) : (
                filtered.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch('');
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-redin-earth-50 transition-colors',
                      opt.value === value &&
                        'bg-redin-gold-50 text-redin-gold-700 font-medium'
                    )}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
