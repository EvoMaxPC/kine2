/**
 * @file whatsappUtils.ts
 * @description Utilidades para formateo de números telefónicos y generación de enlaces directos a la API gratuita de WhatsApp (Click-to-Chat / WhatsApp Web).
 */

/**
 * Sanitiza y formatea cualquier número telefónico al estándar internacional E.164
 * compatible con la API de WhatsApp (ej. WhatsApp Web, wa.me y api.whatsapp.com).
 * 
 * Maneja formatos locales de Argentina y el mundo:
 * - "+54 9 351 555-0199" -> "5493515550199"
 * - "0351 15-555-0199" -> "5493515550199"
 * - "3515550199" -> "5493515550199"
 * - "11 5555 4321" -> "5491155554321"
 */
export function formatWhatsAppPhone(phone: string, defaultCountryCode: string = '54'): string {
  if (!phone) return '';
  
  // Extraer únicamente dígitos
  let digits = phone.replace(/\D/g, '');
  if (!digits) return '';

  // Remover prefijo de discado internacional 00
  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // Si comienza con 0 (prefijo local argentino ej. 0351, 011), remover el 0 inicial
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // Si tiene el '15' de celular argentino intermedio (ej. 351 15 5550199 -> 351155550199)
  // Quitar el 15 si está después del código de área (longitud 12 o 11)
  if (digits.length === 12 && digits.includes('15')) {
    digits = digits.replace('15', '');
  }

  // Si ya tiene código de país '54'
  if (digits.startsWith('54')) {
    // Para números móviles en Argentina, WhatsApp requiere el '9' después del '54' (549...)
    if (!digits.startsWith('549') && digits.length === 12) {
      digits = '549' + digits.substring(2);
    }
    return digits;
  }

  // Si es un número local de 10 dígitos (ej. 3515550199 o 1155554321)
  if (digits.length === 10) {
    return `${defaultCountryCode}9${digits}`;
  }

  // Si es un número local de 8 dígitos (ej. 4550199 - asumimos código de área por defecto 351 Córdoba si no tiene)
  if (digits.length === 8) {
    return `${defaultCountryCode}9351${digits}`;
  }

  // Si ya tiene más de 10 dígitos y no tiene país, agregarle prefijo
  if (digits.length < 11 && !digits.startsWith(defaultCountryCode)) {
    return `${defaultCountryCode}${digits}`;
  }

  return digits;
}

/**
 * Genera el enlace oficial y gratuito de WhatsApp Web / Click-to-Chat
 */
export function generateWhatsAppUrl(phone: string, message: string): string {
  const formattedPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(message.trim());
  return `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedText}`;
}

/**
 * Genera el enlace corto wa.me
 */
export function generateWaMeUrl(phone: string, message: string): string {
  const formattedPhone = formatWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(message.trim());
  return `https://wa.me/${formattedPhone}?text=${encodedText}`;
}

/**
 * Abre directamente WhatsApp Web o la App de WhatsApp con el mensaje pre-cargado.
 * 100% Gratuito, sin costo por mensaje ni requerimiento de tarjeta de crédito.
 */
export function openWhatsAppChat(phone: string, message: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const url = generateWhatsAppUrl(phone, message);
  try {
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Fallback con elemento anchor si popup blocker interviene
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
    return true;
  } catch (err) {
    console.error('[WhatsAppUtils] Error al abrir WhatsApp:', err);
    return false;
  }
}
