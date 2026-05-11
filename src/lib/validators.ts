/**
 * Validadores de campos compartidos entre formularios (registro de institucion,
 * creacion/edicion de interprete, login, etc).
 *
 * Cada validador retorna:
 *   - `null` si el valor es valido (o esta vacio y es opcional).
 *   - Un string con el mensaje de error si es invalido.
 *
 * Diseño: errores inline en cada Input via su prop `error`, no toasts globales.
 * Asi el usuario ve exactamente que campo esta mal sin tener que adivinar.
 */

/** Email — formato basico. Acepta cualquier dominio. */
export function validateEmail(email: string, opts: { required?: boolean } = {}): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return opts.required ? 'Correo requerido' : null;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'Correo invalido';
  }
  return null;
}

/**
 * Telefono mexicano — acepta:
 *   - 10 digitos puros: `5512345678`
 *   - 12 digitos con codigo pais: `525512345678`
 *   - Formatos visuales: `+52 55 1234 5678`, `(55) 1234-5678`, `55-1234-5678`
 *
 * Lo que se valida es la CANTIDAD de digitos despues de remover formato.
 */
export function validatePhone(phone: string, opts: { required?: boolean } = {}): string | null {
  const trimmed = phone.trim();
  if (!trimmed) {
    return opts.required ? 'Telefono requerido' : null;
  }
  // Solo permitimos digitos, espacios, +, -, ( y )
  if (!/^[+0-9\s\-()]+$/.test(trimmed)) {
    return 'Telefono invalido (solo digitos, espacios, +, -)';
  }
  const digits = trimmed.replace(/[^0-9]/g, '');
  if (digits.length === 10) return null;
  if (digits.length === 12 && digits.startsWith('52')) return null;
  return 'Telefono debe tener 10 digitos (Mexico)';
}

/**
 * CLABE interbancaria mexicana — 18 digitos exactos. Es OPCIONAL en los
 * formularios; solo se valida formato si tiene contenido.
 */
export function validateCLABE(clabe: string): string | null {
  const trimmed = clabe.trim();
  if (!trimmed) return null; // opcional
  if (!/^\d{18}$/.test(trimmed)) {
    return 'CLABE debe tener exactamente 18 digitos';
  }
  return null;
}

/** Tarifa por hora — numero positivo. */
export function validateHourlyRate(rate: string): string | null {
  const trimmed = rate.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (isNaN(n) || n < 1) {
    return 'Tarifa debe ser un numero mayor a 0';
  }
  return null;
}

/** Contrasena con longitud minima. */
export function validatePassword(pwd: string, minLength = 6): string | null {
  if (!pwd) return 'Contrasena requerida';
  if (pwd.length < minLength) {
    return `Contrasena debe tener al menos ${minLength} caracteres`;
  }
  return null;
}

/** Confirmacion: la segunda debe coincidir con la primera. */
export function validatePasswordMatch(pwd: string, confirm: string): string | null {
  if (!confirm) return 'Confirma la contrasena';
  if (pwd !== confirm) return 'Las contrasenas no coinciden';
  return null;
}

/** Nombre — minimo 2 caracteres tras trim. */
export function validateName(name: string, label = 'Nombre'): string | null {
  const trimmed = name.trim();
  if (!trimmed) return `${label} requerido`;
  if (trimmed.length < 2) return `${label} muy corto`;
  return null;
}

/**
 * Limpia el telefono a 10 digitos puros (formato canonico para guardar / enviar).
 * Ej. `+52 (55) 1234-5678` → `5512345678`.
 *
 * Llamar SOLO despues de pasar `validatePhone` exitosamente.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.startsWith('52')) return digits.slice(2);
  return digits;
}
