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
 * Telefono nacional — exactamente 10 digitos. El lada (+52 MX / +1 US) va
 * aparte via el componente `PhoneInput`, asi que aqui solo validamos digitos
 * nacionales.
 *
 * Recibe ya filtrado a digitos (PhoneInput hace el filter al escribir), pero
 * por defensa tambien limpiamos no-digitos antes de medir.
 */
export function validatePhone(phone: string, opts: { required?: boolean } = {}): string | null {
  const digits = phone.replace(/[^0-9]/g, '');
  if (!digits) {
    return opts.required ? 'Telefono requerido' : null;
  }
  if (digits.length !== 10) {
    return 'Telefono debe tener 10 digitos';
  }
  return null;
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
 * Limpia el telefono a digitos nacionales (10 digitos sin lada). Tolera
 * formatos legacy con codigo pais.
 *
 * Llamar SOLO despues de pasar `validatePhone` exitosamente.
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.startsWith('52')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits.slice(0, 10);
}
