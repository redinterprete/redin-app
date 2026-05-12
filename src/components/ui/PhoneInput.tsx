'use client';

import { useId } from 'react';
import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Lista de paises soportados. Ambos (MX y US) tienen numeros nacionales de 10
 * digitos, asi que la validacion del input es identica — solo cambia el lada.
 *
 * Para agregar mas paises: anade aqui y asegurate que el backend acepte el
 * formato E.164 resultante (ver validators de auth/interpreters).
 */
export const PHONE_COUNTRIES = [
  { code: 'MX', dialCode: '52', label: 'Mexico' },
  { code: 'US', dialCode: '1', label: 'Estados Unidos' },
] as const;

export type PhoneCountry = (typeof PHONE_COUNTRIES)[number]['code'];

export const DEFAULT_PHONE_COUNTRY: PhoneCountry = 'MX';

interface PhoneInputProps {
  label?: string;
  /** Solo los digitos nacionales (sin lada). Maximo 10. */
  value: string;
  country?: PhoneCountry;
  onChange: (value: string) => void;
  onCountryChange?: (country: PhoneCountry) => void;
  onBlur?: () => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Input de telefono con selector de lada al inicio (MX/EUA). El usuario solo
 * escribe los 10 digitos del numero — el lada va aparte y se concatena al
 * guardar via `formatPhoneE164()`.
 *
 * El input filtra a digitos automaticamente y limita a 10 chars, asi que no
 * hay forma de meter mas o letras.
 */
export function PhoneInput({
  label,
  value,
  country = DEFAULT_PHONE_COUNTRY,
  onChange,
  onCountryChange,
  onBlur,
  error,
  required,
  disabled,
  placeholder = '55 1234 5678',
}: PhoneInputProps) {
  const id = useId();

  function handleDigitsChange(raw: string) {
    // Solo digitos, maximo 10.
    const filtered = raw.replace(/[^0-9]/g, '').slice(0, 10);
    onChange(filtered);
  }

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-redin-earth-700"
        >
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex rounded-lg border bg-white overflow-hidden transition-colors duration-200',
          'focus-within:ring-2 focus-within:outline-none',
          error
            ? 'border-red-400 focus-within:border-red-500 focus-within:ring-red-100'
            : 'border-redin-earth-200 focus-within:border-redin-gold-400 focus-within:ring-redin-gold-100',
          disabled && 'bg-redin-earth-50 cursor-not-allowed opacity-70'
        )}
      >
        {/* Selector de lada — fondo gris claro para diferenciar del input */}
        <select
          value={country}
          onChange={(e) => onCountryChange?.(e.target.value as PhoneCountry)}
          disabled={disabled || !onCountryChange}
          aria-label="Lada"
          className="border-r border-redin-earth-200 bg-redin-earth-50 px-2 py-2 text-sm font-medium text-redin-earth-700 cursor-pointer focus:outline-none disabled:cursor-not-allowed"
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              +{c.dialCode}
            </option>
          ))}
        </select>

        {/* Input de digitos — icono Phone como adornment */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-redin-earth-400">
            <Phone className="h-4 w-4" />
          </div>
          <input
            id={id}
            type="tel"
            inputMode="numeric"
            value={value}
            onChange={(e) => handleDigitsChange(e.target.value)}
            onBlur={onBlur}
            disabled={disabled}
            placeholder={placeholder}
            maxLength={10}
            required={required}
            className="w-full bg-transparent pl-10 pr-3 py-2 text-redin-earth-900 placeholder:text-redin-earth-400 focus:outline-none disabled:cursor-not-allowed"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/**
 * Concatena lada + digitos en formato E.164 (sin el "+").
 *   formatPhoneE164('5512345678', 'MX') → '525512345678'
 *   formatPhoneE164('5551234567', 'US') → '15551234567'
 *
 * Si los digitos no son exactamente 10 retorna string vacio — el caller debe
 * validar primero con `validatePhone()`.
 */
export function formatPhoneE164(digits: string, country: PhoneCountry): string {
  const clean = digits.replace(/[^0-9]/g, '');
  if (clean.length !== 10) return '';
  const dial = PHONE_COUNTRIES.find((c) => c.code === country)?.dialCode;
  if (!dial) return clean;
  return `${dial}${clean}`;
}

/**
 * Inverso de formatPhoneE164: dado un numero almacenado (10, 11, o 12 digitos)
 * infiere la lada y devuelve `{ digits, country }`. Util al precargar un form
 * de edicion con un telefono guardado.
 */
export function parsePhoneStored(stored: string): { digits: string; country: PhoneCountry } {
  const clean = stored.replace(/[^0-9]/g, '');
  if (clean.length === 12 && clean.startsWith('52')) {
    return { digits: clean.slice(2), country: 'MX' };
  }
  if (clean.length === 11 && clean.startsWith('1')) {
    return { digits: clean.slice(1), country: 'US' };
  }
  // Default: 10 digitos puros → asumimos MX (compat con datos legacy).
  return { digits: clean.slice(0, 10), country: DEFAULT_PHONE_COUNTRY };
}
