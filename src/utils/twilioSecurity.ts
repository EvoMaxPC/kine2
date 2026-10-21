/**
 * @file twilioSecurity.ts
 * @description Utilidad de seguridad y validación robusta de firmas para Webhooks de Twilio.
 * 
 * Implementa la especificación criptográfica oficial utilizando el SDK de Twilio (twilio.validateRequest / twilio.validateExpressRequest)
 * con capas adicionales de protección contra:
 * 1. Ataques de Prototype Pollution e Inyección de Parámetros (__proto__, constructor, prototype).
 * 2. Inyección de Encabezados de Host y Manipulación de URLs (Host Header Injection / SSRF / CRLF).
 * 3. Firmas X-Twilio-Signature malformadas o alteradas (Base64 HMAC-SHA1).
 * 4. Ataques de sincronización de tiempos (Timing Attacks) mediante comparaciones seguras.
 * 5. Replicación en múltiples URLs candidatas para entornos Cloud Run / proxies reversos SSL.
 */

import twilio from 'twilio';
import type { Request, Response, NextFunction } from 'express';

export type TwilioValidationStatus =
  | 'VALID'
  | 'INVALID'
  | 'SKIPPED_NO_TOKEN'
  | 'REJECTED_MALICIOUS';

export interface TwilioSignatureValidationResult {
  isValid: boolean;
  status: TwilioValidationStatus;
  matchedUrl: string | null;
  candidateUrls: string[];
  signatureProvided: boolean;
  maskedSignature: string;
  reason: string;
}

export interface TwilioSecurityOptions {
  authToken?: string;
  expectedPath?: string;
  allowSkipIfNoToken?: boolean;
  extraCandidateUrls?: string[];
}

/**
 * Expresión regular para validar formato Base64 estándar de X-Twilio-Signature.
 * Twilio genera firmas HMAC-SHA1 codificadas en Base64 (28 caracteres con padding '='),
 * permitiendo también variantes SHA-256 (44 caracteres) sin admitir caracteres de inyección.
 */
const TWILIO_SIGNATURE_REGEX = /^[A-Za-z0-9+/]{26,43}={0,2}$/;

/**
 * Propiedades prohibidas para proteger contra ataques de Prototype Pollution.
 */
const FORBIDDEN_PARAM_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Caracteres peligrosos no permitidos en nombres de host para prevenir Host Header Injection, SSRF y CRLF.
 */
const DANGEROUS_HOST_CHARS = /[\r\n\t\0\s<>"'`@#?%&]/;

/**
 * Enmascara una firma para logs y auditoría sin exponer el hash completo.
 */
export function maskTwilioSignature(signature: string): string {
  if (!signature) return '';
  if (signature.length <= 10) return '***';
  return `${signature.substring(0, 6)}...${signature.substring(signature.length - 4)}`;
}

/**
 * Valida si un string de firma posee el formato Base64 estándar esperado por Twilio.
 */
export function isWellFormedTwilioSignature(signature: string): boolean {
  if (!signature || typeof signature !== 'string') return false;
  const trimmed = signature.trim();
  // Twilio HMAC-SHA1 Base64 es de 28 caracteres (27 caracteres base64 + 1 signo '=')
  return TWILIO_SIGNATURE_REGEX.test(trimmed);
}

/**
 * Sanitiza y purga parámetros de la petición para prevenir ataques de inyección,
 * Prototype Pollution y manipulación de tipos.
 * Extrae únicamente claves válidas y transforma los valores a strings escalares planos.
 */
export function sanitizeAndFlattenTwilioParams(params: Record<string, any> | undefined | null): Record<string, string> {
  if (!params || typeof params !== 'object') {
    return {};
  }

  const clean: Record<string, string> = Object.create(null);

  for (const [key, rawValue] of Object.entries(params)) {
    // 1. Descartar claves de prototipo
    const trimmedKey = String(key).trim();
    if (!trimmedKey || FORBIDDEN_PARAM_KEYS.has(trimmedKey.toLowerCase())) {
      continue;
    }

    // 2. Prevenir inyección de arrays/objetos anidados
    if (rawValue === null || rawValue === undefined) {
      clean[trimmedKey] = '';
    } else if (typeof rawValue === 'object') {
      // Si el cliente inyectó un array u objeto arbitrario, extraer sólo valores escalares seguros
      if (Array.isArray(rawValue)) {
        clean[trimmedKey] = rawValue.length > 0 ? String(rawValue[0]) : '';
      } else {
        // Objeto plano inyectado: no permitir propagación no escalar
        continue;
      }
    } else {
      clean[trimmedKey] = String(rawValue);
    }
  }

  return clean;
}

/**
 * Valida si un hostname es seguro y no contiene ataques de inyección de cabeceras.
 */
export function isSafeHostname(host: string): boolean {
  if (!host || typeof host !== 'string') return false;
  if (host.length > 255) return false;
  if (DANGEROUS_HOST_CHARS.test(host)) return false;
  if (host.includes('..') || host.includes('/') || host.includes('\\')) return false;
  return true;
}

/**
 * Construye de manera segura y controlada las URLs candidatas para la validación de firma
 * en Cloud Run, proxies reversos y entornos de producción.
 */
export function buildCandidateUrls(
  req: Request,
  expectedPath: string,
  extraCandidateUrls: string[] = []
): string[] {
  const candidates: string[] = [];

  const addCandidate = (rawUrl: string) => {
    if (!rawUrl || typeof rawUrl !== 'string') return;
    try {
      const parsed = new URL(rawUrl);
      // Solo protocolos seguros HTTP/HTTPS
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return;
      if (!isSafeHostname(parsed.hostname)) return;

      // Normalizar pathname a la ruta esperada
      parsed.pathname = expectedPath.startsWith('/') ? expectedPath : `/${expectedPath}`;
      parsed.search = '';
      parsed.hash = '';

      const normalized = parsed.toString().replace(/\/$/, '');
      if (!candidates.includes(normalized)) {
        candidates.push(normalized);
      }
    } catch {
      // URL inválida descartada pacíficamente
    }
  };

  // 1. Variable de entorno explícita PUBLIC_BASE_URL / APP_URL
  if (process.env.PUBLIC_BASE_URL) {
    addCandidate(`${process.env.PUBLIC_BASE_URL}${expectedPath}`);
  }
  if (process.env.APP_URL) {
    addCandidate(`${process.env.APP_URL}${expectedPath}`);
  }
  if (process.env.CLOUD_RUN_URL) {
    addCandidate(`${process.env.CLOUD_RUN_URL}${expectedPath}`);
  }

  // 2. Cabeceras enviadas por Cloud Run / reverse proxies (validando que el host sea seguro)
  const forwardedHost = req.get('x-forwarded-host');
  if (forwardedHost && isSafeHostname(forwardedHost)) {
    const proto = req.get('x-forwarded-proto') || 'https';
    addCandidate(`${proto}://${forwardedHost}${expectedPath}`);
  }

  const directHost = req.get('host');
  if (directHost && isSafeHostname(directHost)) {
    const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'https');
    addCandidate(`${proto}://${directHost}${expectedPath}`);
  }

  // 3. Fallbacks controlados de desarrollo/staging
  const devAppUrl = process.env.DEV_APP_URL || 'https://ais-dev-wd2m6j5fuu77jxh4ldjadl-135361764474.us-east1.run.app';
  addCandidate(`${devAppUrl}${expectedPath}`);

  // 4. URLs adicionales provistas por configuración
  for (const extra of extraCandidateUrls) {
    addCandidate(extra);
  }

  return candidates;
}

/**
 * Validador principal robusto que invoca la función oficial twilio.validateRequest del SDK de Twilio.
 * Aplica saneamiento previo contra inyecciones y ejecuta la validación frente a la lista de URLs candidatas.
 */
export function validateTwilioWebhookSignature(
  authToken: string | undefined,
  twilioSignature: string | undefined,
  candidateUrls: string[],
  params: Record<string, any>
): TwilioSignatureValidationResult {
  const signature = (twilioSignature || '').trim();
  const token = (authToken || '').trim();
  const maskedSig = maskTwilioSignature(signature);

  // 1. Si no hay token de autenticación configurado en el servidor
  if (!token) {
    return {
      isValid: false,
      status: 'SKIPPED_NO_TOKEN',
      matchedUrl: null,
      candidateUrls,
      signatureProvided: Boolean(signature),
      maskedSignature: maskedSig,
      reason: 'TWILIO_AUTH_TOKEN no configurado en entorno server-side',
    };
  }

  // 2. Si no se proveyó la cabecera X-Twilio-Signature
  if (!signature) {
    return {
      isValid: false,
      status: 'INVALID',
      matchedUrl: null,
      candidateUrls,
      signatureProvided: false,
      maskedSignature: '',
      reason: 'Encabezado X-Twilio-Signature ausente en la petición entrante',
    };
  }

  // 3. Protección contra inyección / firmas con formato alterado o malicioso
  if (!isWellFormedTwilioSignature(signature)) {
    return {
      isValid: false,
      status: 'REJECTED_MALICIOUS',
      matchedUrl: null,
      candidateUrls,
      signatureProvided: true,
      maskedSignature: maskedSig,
      reason: 'X-Twilio-Signature posee un formato Base64 inválido o sospechoso (rechazado por seguridad)',
    };
  }

  // 4. Saneamiento estricto de parámetros de la petición (anti Prototype Pollution / inyección)
  const sanitizedParams = sanitizeAndFlattenTwilioParams(params);

  // 5. Verificación criptográfica con el SDK oficial de Twilio para cada URL candidata
  for (const url of candidateUrls) {
    try {
      // Uso directo del SDK oficial de Twilio
      const isValid = twilio.validateRequest(token, signature, url, sanitizedParams);
      if (isValid) {
        return {
          isValid: true,
          status: 'VALID',
          matchedUrl: url,
          candidateUrls,
          signatureProvided: true,
          maskedSignature: maskedSig,
          reason: `Firma validada exitosamente mediante Twilio SDK oficial en: ${url}`,
        };
      }
    } catch (err: any) {
      // Si el SDK falla por alguna razón de formato en una URL particular, continuar con la siguiente
      console.warn(`[TwilioSecurity] Error al evaluar URL candidata "${url}":`, err?.message || err);
    }
  }

  // 6. Firma no coincidió con ninguna URL candidata legítima
  return {
    isValid: false,
    status: 'INVALID',
    matchedUrl: null,
    candidateUrls,
    signatureProvided: true,
    maskedSignature: maskedSig,
    reason: `X-Twilio-Signature no coincidió con ninguna de las ${candidateUrls.length} URLs candidatas autorizadas`,
  };
}

/**
 * Helper para validar peticiones Express completas usando el SDK oficial de Twilio.
 */
export function validateExpressTwilioWebhook(
  req: Request,
  options: TwilioSecurityOptions = {}
): TwilioSignatureValidationResult {
  const authToken = options.authToken || process.env.TWILIO_AUTH_TOKEN;
  const signature = (req.get('X-Twilio-Signature') || req.get('x-twilio-signature') || '').trim();
  const expectedPath = options.expectedPath || req.baseUrl + req.path || req.originalUrl.split('?')[0];

  const candidateUrls = buildCandidateUrls(req, expectedPath, options.extraCandidateUrls);

  const result = validateTwilioWebhookSignature(authToken, signature, candidateUrls, req.body || {});

  // Si allowSkipIfNoToken está habilitado (útil para pruebas locales sin secretos reales)
  if (!authToken && options.allowSkipIfNoToken) {
    return {
      ...result,
      isValid: true,
      status: 'SKIPPED_NO_TOKEN',
      reason: 'Validación omitida intencionalmente (allowSkipIfNoToken activo en entorno de desarrollo)',
    };
  }

  return result;
}

/**
 * Middleware de Express para proteger automáticamente cualquier endpoint de Webhook de Twilio.
 * Si la firma es inválida, responde inmediatamente con HTTP 403 Forbidden sin procesar la carga.
 */
export function createTwilioWebhookSecurityMiddleware(options: TwilioSecurityOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = validateExpressTwilioWebhook(req, options);

    // Adjuntar resultado para auditoría y diagnósticos posteriores
    (req as any).twilioSecurityResult = result;

    if (!result.isValid) {
      console.warn(`[TwilioSecurityMiddleware] Acceso rechazado (HTTP 403): ${result.reason}`);
      return res.status(403).end();
    }

    next();
  };
}
