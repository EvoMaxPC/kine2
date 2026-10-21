/**
 * Utilidades para normalización y detección de teléfonos argentinos.
 * Regla: Sin inventar prefijos cuando la información sea ambigua.
 */

/**
 * Utilidades para normalización y detección de teléfonos argentinos e internacionales.
 * Regla: Sin inventar prefijos cuando la información sea ambigua.
 */

/**
 * Quita cualquier prefijo 'whatsapp:' (incluso si estuviese duplicado) y espacios adicionales.
 */
export function cleanWhatsAppPrefix(phone: string): string {
  if (!phone) return '';
  return phone.replace(/^(whatsapp:)+/gi, '').trim();
}

/**
 * Normaliza cualquier número de teléfono (Argentina, USA, etc.) a formato canónico E.164 (+[código][número]).
 * - No agrega prefijo argentino (549) a números de otros países (ej. USA +1737...).
 * - Remueve el prefijo "whatsapp:" si existiera.
 * - Asegura el formato correcto para celulares de Argentina (+549...).
 */
export function normalizeToE164(phone: string, defaultCountryCode: string = '54'): string {
  if (!phone) return '';

  const withoutPrefix = cleanWhatsAppPrefix(phone);
  let cleaned = withoutPrefix.replace(/[\s\-\.\(\)\/]/g, '').trim();

  if (!/\d/.test(cleaned)) return phone.trim();

  const hadPlus = cleaned.startsWith('+');
  if (hadPlus) {
    cleaned = cleaned.substring(1);
  }

  // Si comienza con 00 (código de salida internacional)
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }

  // 1. Números de USA / Canadá (+1...)
  // Si tenía '+' y empieza con 1 (ej: +17372508034) o tiene 11 dígitos empezando con 1
  if ((hadPlus && cleaned.startsWith('1')) || (cleaned.length === 11 && cleaned.startsWith('1'))) {
    return `+${cleaned}`;
  }

  // 2. Números de Argentina (+54...)
  if (cleaned.startsWith('549')) {
    return `+${cleaned}`;
  }

  if (cleaned.startsWith('54') && cleaned.length === 12) {
    return `+549${cleaned.substring(2)}`;
  }

  // 3. Números nacionales con 0 inicial (ej: 0341..., 011...)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Quitar el '15' de celular local si está presente (ej. 341 15 6051574 -> 3416051574)
  if (cleaned.length === 12 && /^\d{2,4}15\d{6,8}$/.test(cleaned)) {
    cleaned = cleaned.replace('15', '');
  }

  // 4. Formato local argentino de 10 dígitos (ej: 3416051574 o 3436224149)
  if (cleaned.length === 10) {
    return `+${defaultCountryCode}9${cleaned}`;
  }

  // 5. Formato local de 8 dígitos (ej: 6051574 -> asume 341)
  if (cleaned.length === 8) {
    return `+${defaultCountryCode}9341${cleaned}`;
  }

  if (hadPlus) {
    return `+${cleaned}`;
  }

  // Si no coincide con un formato conocido, retornar con '+'
  return `+${cleaned}`;
}

/**
 * Normaliza y formatea un teléfono para la API de Twilio WhatsApp.
 * Devuelve siempre: "whatsapp:+[E.164]"
 * Garantiza que NO duplica el prefijo ("whatsapp:whatsapp:+...").
 */
export function normalizeToTwilioWhatsApp(phone: string): string {
  if (!phone) return '';
  const e164 = normalizeToE164(phone);
  return `whatsapp:${e164}`;
}

/**
 * Valida si un string cumple con el formato E.164 (+ y entre 7 y 15 dígitos)
 */
export function isValidE164(phone: string): boolean {
  if (!phone) return false;
  return /^\+[1-9]\d{6,14}$/.test(cleanWhatsAppPrefix(phone).replace(/\s/g, ''));
}

export function normalizeArgentinePhoneNumber(phone: string): string {
  if (!phone) return '';

  const withoutPrefix = cleanWhatsAppPrefix(phone);
  // Quitar espacios, guiones, puntos, paréntesis y barras
  let cleaned = withoutPrefix.replace(/[\s\-\.\(\)\/]/g, '').trim();

  // Si no tiene dígitos, retornar tal cual
  if (!/\d/.test(cleaned)) return phone.trim();

  const hasPlus = cleaned.startsWith('+');
  if (hasPlus) {
    cleaned = cleaned.substring(1);
  }

  // 0054 -> 54
  if (cleaned.startsWith('0054')) {
    cleaned = cleaned.substring(2);
  }

  // Si ya tiene formato internacional argentino 549 (ej: 5491155551111)
  if (cleaned.startsWith('549')) {
    // Si tiene 13 dígitos (+54 9 XX XXXX-XXXX)
    if (cleaned.length === 13) {
      const area = cleaned.substring(3, 5);
      const part1 = cleaned.substring(5, 9);
      const part2 = cleaned.substring(9);
      return `+54 9 ${area} ${part1}-${part2}`;
    }
    return `+${cleaned}`;
  }

  // Si tiene 54 pero sin el 9 de móvil (ej: 541155551111)
  if (cleaned.startsWith('54') && cleaned.length === 12) {
    const area = cleaned.substring(2, 4);
    const part1 = cleaned.substring(4, 8);
    const part2 = cleaned.substring(8);
    return `+54 9 ${area} ${part1}-${part2}`;
  }

  // Si empieza con 0 nacional (ej: 01155551111 o 0111555551111), quitar el 0
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Si tiene el '15' de celular local tras código de área común (ej: 11-15-5555-1111 -> 1155551111)
  if (cleaned.length === 12 && cleaned.startsWith('1115')) {
    cleaned = `11${cleaned.substring(4)}`;
  } else if (cleaned.length === 12 && /^\d{3}15\d{7}$/.test(cleaned)) {
    cleaned = cleaned.substring(0, 3) + cleaned.substring(5);
  }

  // Formato estándar de 10 dígitos (ej: 11 5555 1111 o 351 555 1111)
  if (cleaned.length === 10) {
    const area = cleaned.substring(0, 2);
    const part1 = cleaned.substring(2, 6);
    const part2 = cleaned.substring(6);
    return `+54 9 ${area} ${part1}-${part2}`;
  }

  if (hasPlus) {
    return `+${cleaned}`;
  }

  return cleaned;
}

/**
 * Extrae solo los dígitos finales significativos para comparaciones seguras de duplicados
 */
export function getComparablePhoneDigits(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length >= 8) {
    return digits.slice(-8);
  }
  return digits;
}
