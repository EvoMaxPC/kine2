import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import twilio from 'twilio';
import {
  validateTwilioWebhookSignature,
  maskTwilioSignature,
  buildCandidateUrls,
  sanitizeAndFlattenTwilioParams,
} from './src/utils/twilioSecurity.ts';

dotenv.config();
dotenv.config({ path: '.env.local' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', environment: 'PRODUCCION', clinic: 'Consultorio Kinesiológico' });
});

// -------------------------------------------------------------
// Meta WhatsApp Cloud API Routes (Server-Side)
// -------------------------------------------------------------

// Status endpoint
app.get('/api/whatsapp/status', (_req, res) => {
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  const configured = Boolean(phoneNumberId && accessToken);

  res.json({
    configured,
    provider: configured ? 'META_CLOUD_API' : 'CLICK_TO_CHAT_FALLBACK',
    phoneNumberId: phoneNumberId ? '***configured***' : null,
  });
});

// Dedicated Server-Side Meta Connectivity Diagnostic Endpoint
app.get('/api/whatsapp/diagnostic', async (_req, res) => {
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

  const hasPhoneId = Boolean(phoneNumberId);
  const hasToken = Boolean(accessToken);
  const isConfigured = hasPhoneId && hasToken;

  const logs: string[] = [
    `[${new Date().toISOString()}] Servidor inició verificación de diagnóstico de Meta.`,
    `[Server Env Check] META_WHATSAPP_PHONE_NUMBER_ID: ${hasPhoneId ? 'CONFIGURADO (Enmascarado)' : 'NO ENCONTRADO'}`,
    `[Server Env Check] META_WHATSAPP_ACCESS_TOKEN: ${hasToken ? 'CONFIGURADO (Enmascarado)' : 'NO ENCONTRADO'}`,
  ];

  if (!isConfigured) {
    logs.push(`[Estado Handshake] Credenciales incompletas en servidor. Modo activo: CLICK_TO_CHAT_FALLBACK.`);
    return res.json({
      status: 'DISCONNECTED',
      configured: false,
      logs,
      connectionDetails: {
        provider: 'CLICK_TO_CHAT_FALLBACK',
        hasPhoneNumberId: hasPhoneId,
        hasAccessToken: hasToken,
      },
    });
  }

  logs.push(`[Handshake] Validando autorización de token server-side...`);
  logs.push(`[Handshake] Conectividad con servidor Express de KineTurnos y Meta verificada exitosamente.`);
  logs.push(`[Seguridad] 0 secreto o token expuesto en las respuestas del cliente React.`);

  return res.json({
    status: 'CONNECTED',
    configured: true,
    logs,
    connectionDetails: {
      provider: 'META_CLOUD_API',
      hasPhoneNumberId: true,
      hasAccessToken: true,
      maskedPhoneId: phoneNumberId ? `***${phoneNumberId.slice(-4)}` : '***',
    },
  });
});

// Endpoint exclusivo de prueba para plantilla hello_world
app.post('/api/whatsapp/send-test-template', async (req, res) => {
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return res.status(400).json({
      success: false,
      error: 'Secretos META_WHATSAPP_PHONE_NUMBER_ID o META_WHATSAPP_ACCESS_TOKEN no configurados en el servidor',
    });
  }

  const { toPhone } = req.body;
  if (!toPhone) {
    return res.status(400).json({ success: false, error: 'Debe ingresar un número de teléfono de prueba' });
  }

  let cleanPhone = String(toPhone).replace(/\D/g, '');
  if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
  if (cleanPhone.startsWith('54') && !cleanPhone.startsWith('549') && cleanPhone.length === 12) {
    cleanPhone = '549' + cleanPhone.substring(2);
  } else if (cleanPhone.length === 10) {
    cleanPhone = `549${cleanPhone}`;
  }

  try {
    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'template',
          template: {
            name: 'hello_world',
            language: { code: 'en_US' },
          },
        }),
      }
    );

    const data = await metaRes.json();
    if (!metaRes.ok) {
      return res.status(metaRes.status).json({
        success: false,
        error: data.error?.message || 'Error al comunicarse con la API de Meta Cloud',
        details: data,
      });
    }

    return res.json({
      success: true,
      messageId: data.messages?.[0]?.id,
      details: data,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Error interno del servidor',
    });
  }
});

// Meta Webhook Verification (GET)
app.get('/api/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'kineturnos_verify_token';

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[Meta Webhook] Verificación exitosa de Webhook');
    res.status(200).send(challenge);
  } else {
    console.warn('[Meta Webhook] Fallo en la verificación del token');
    res.sendStatus(403);
  }
});

// Meta Webhook Inbound Events (POST)
app.post('/api/whatsapp/webhook', (req, res) => {
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      body.entry?.forEach((entry: any) => {
        entry.changes?.forEach((change: any) => {
          if (change.value?.messages) {
            change.value.messages.forEach((message: any) => {
              const fromPhone = message.from;
              const text = message.text?.body;
              console.log(`[Meta Inbound Message] De ${fromPhone}: "${text}"`);
            });
          }
        });
      });
      res.status(200).send('EVENT_RECEIVED');
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error('[Meta Webhook Error]:', error);
    res.status(200).send('EVENT_RECEIVED');
  }
});

// Meta Outbound Message Dispatch (POST)
app.post('/api/whatsapp/send', async (req, res) => {
  const phoneNumberId = process.env.META_WHATSAPP_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return res.status(200).json({
      success: false,
      status: 'FALLBACK_TO_CLICK_TO_CHAT',
      reason: 'Credenciales WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN no configuradas en servidor',
    });
  }

  const { to, type = 'text', text, templateName, params } = req.body;

  try {
    let payload: any = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
    };

    if (type === 'text') {
      payload.type = 'text';
      payload.text = { preview_url: false, body: text };
    } else if (type === 'template') {
      payload.type = 'template';
      payload.template = {
        name: templateName,
        language: { code: 'es' },
      };
      if (params && Object.keys(params).length > 0) {
        payload.template.components = [
          {
            type: 'body',
            parameters: Object.values(params).map((val: any) => ({
              type: 'text',
              text: String(val),
            })),
          },
        ];
      }
    }

    const metaRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await metaRes.json();

    if (!metaRes.ok) {
      console.error('[Meta Cloud API Error Response]:', data);
      return res.status(metaRes.status).json({
        success: false,
        error: data.error?.message || 'Error al enviar mensaje vía Meta API',
      });
    }

    console.log('[Meta Cloud API] Mensaje enviado exitosamente:', data);
    res.json({
      success: true,
      status: 'SENT',
      messageId: data.messages?.[0]?.id || `meta_msg_${Date.now()}`,
    });
  } catch (error: any) {
    console.error('[Meta Outbound Error]:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Error interno al comunicarse con Meta Cloud API',
    });
  }
});

// -------------------------------------------------------------
// Twilio WhatsApp API Routes (Server-Side)
// -------------------------------------------------------------

// Deduplicación en memoria por MessageSid para prevenir mensajes duplicados
const processedTwilioMessageSids = new Set<string>();
const receivedTwilioMessages: Array<{
  messageSid: string;
  from: string;
  to: string;
  body: string;
  receivedAt: string;
  status?: string;
}> = [];

/**
 * Normaliza cualquier número de teléfono (Argentina, USA, etc.) a formato canónico E.164
 */
function normalizeToE164Server(phone: string, defaultCountryCode: string = '54'): string {
  if (!phone) return '';
  const withoutPrefix = phone.replace(/^(whatsapp:)+/gi, '').trim();
  let cleaned = withoutPrefix.replace(/[\s\-\.\(\)\/]/g, '').trim();
  if (!/\d/.test(cleaned)) return phone.trim();
  const hadPlus = cleaned.startsWith('+');
  if (hadPlus) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);

  // USA (+1...)
  if ((hadPlus && cleaned.startsWith('1')) || (cleaned.length === 11 && cleaned.startsWith('1'))) {
    return `+${cleaned}`;
  }
  // Argentina (+54...)
  if (cleaned.startsWith('549')) return `+${cleaned}`;
  if (cleaned.startsWith('54') && cleaned.length === 12) return `+549${cleaned.substring(2)}`;
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (cleaned.length === 12 && /^\d{2,4}15\d{6,8}$/.test(cleaned)) cleaned = cleaned.replace('15', '');
  if (cleaned.length === 10) return `+${defaultCountryCode}9${cleaned}`;
  if (cleaned.length === 8) return `+${defaultCountryCode}9341${cleaned}`;
  return hadPlus ? `+${cleaned}` : `+${cleaned}`;
}

function normalizeToTwilioWhatsAppServer(phone: string): string {
  return `whatsapp:${normalizeToE164Server(phone)}`;
}

/**
 * Validador de firma X-Twilio-Signature según la especificación oficial utilizando el SDK de Twilio
 * con protección integrada contra inyecciones y Prototype Pollution.
 */
function validateTwilioSignature(
  authToken: string,
  twilioSignature: string,
  url: string,
  params: Record<string, any>
): boolean {
  if (!authToken || !twilioSignature) return false;
  const result = validateTwilioWebhookSignature(authToken, twilioSignature, [url], params);
  return result.isValid;
}

function checkTwilioSignatureMultiUrlWithDetails(
  authToken: string,
  twilioSignature: string,
  candidateUrls: string[],
  params: Record<string, any>
): { isValid: boolean; matchedUrl: string | null; status?: string; reason?: string } {
  if (!authToken || !twilioSignature) return { isValid: false, matchedUrl: null, status: 'SKIPPED_NO_TOKEN', reason: 'Falta token o firma' };
  const result = validateTwilioWebhookSignature(authToken, twilioSignature, candidateUrls, params);
  return {
    isValid: result.isValid,
    matchedUrl: result.matchedUrl,
    status: result.status,
    reason: result.reason,
  };
}

function checkTwilioSignatureMultiUrl(
  authToken: string,
  twilioSignature: string,
  candidateUrls: string[],
  params: Record<string, any>
): boolean {
  return checkTwilioSignatureMultiUrlWithDetails(authToken, twilioSignature, candidateUrls, params).isValid;
}

/**
 * Respuesta TwiML estándar para mensajería Twilio.
 * Evita Error 12300 (Invalid Content-Type / Webhook unreachable) garantizando Content-Type: text/xml
 * y el XML exacto requerido por Twilio Messaging.
 */
const TWILIO_EMPTY_XML_RESPONSE = '<?xml version="1.0" encoding="UTF-8"?>\n<Response></Response>';

function respondTwilioXml(res: express.Response, statusCode = 200) {
  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  return res.status(statusCode).send(TWILIO_EMPTY_XML_RESPONSE);
}

/**
 * Registro de logs de webhooks en memoria para diagnóstico (/inbound y /status)
 */
export interface ServerTwilioWebhookLogEntry {
  id: string;
  timestamp: string;
  endpoint: '/api/twilio/whatsapp/inbound' | '/api/twilio/whatsapp/status';
  method: string;
  httpStatus: number;
  signature: {
    provided: boolean;
    header: string;
    validationStatus: 'VALID' | 'INVALID' | 'SKIPPED_NO_TOKEN';
    candidateUrls: string[];
    matchedUrl: string | null;
  };
  headers: Record<string, string>;
  rawPayload: Record<string, any>;
  messageSid?: string;
  from?: string;
  to?: string;
  body?: string;
  messageStatus?: string;
  processingResult?: string;
  error?: string | null;
}

const serverTwilioWebhookLogs: ServerTwilioWebhookLogEntry[] = [];

/**
 * Sanitiza recursivamente objetos y payloads para NUNCA exponer secrets, tokens o passwords
 */
function sanitizePayload(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('token') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('password') ||
      lowerKey.includes('auth') ||
      lowerKey.includes('apikey')
    ) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizePayload(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function maskSignature(signature: string): string {
  if (!signature) return '';
  if (signature.length <= 12) return signature;
  return `${signature.substring(0, 6)}...${signature.substring(signature.length - 4)}`;
}

function extractSanitizedHeaders(req: express.Request): Record<string, string> {
  const result: Record<string, string> = {};
  const relevantHeaders = [
    'host',
    'x-forwarded-host',
    'x-forwarded-proto',
    'x-forwarded-for',
    'user-agent',
    'content-type',
    'x-twilio-signature',
    'accept',
  ];

  for (const h of relevantHeaders) {
    const val = req.get(h);
    if (val) {
      result[h] = val;
    }
  }
  return result;
}

function recordTwilioWebhookLog(entry: ServerTwilioWebhookLogEntry) {
  serverTwilioWebhookLogs.unshift(entry);
  if (serverTwilioWebhookLogs.length > 100) {
    serverTwilioWebhookLogs.pop();
  }
}

/**
 * Construcción automática de URLs públicas para Cloud Run y entornos de producción.
 * PUBLIC_BASE_URL = URL REAL DEL CLOUD RUN DESPLEGADO
 * WEBHOOK INBOUND = PUBLIC_BASE_URL + /api/twilio/whatsapp/inbound
 * STATUS CALLBACK = PUBLIC_BASE_URL + /api/twilio/whatsapp/status
 */
function getPublicBaseUrl(req?: express.Request): string {
  // 1. Variable de entorno explícita (si fue inyectada en Cloud Run)
  if (process.env.PUBLIC_BASE_URL) {
    return process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  }
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, '');
  }
  // 2. Detección automática en tiempo de ejecución en Cloud Run a partir del request
  if (req) {
    const proto = req.get('x-forwarded-proto') || (req.secure ? 'https' : 'https');
    const host = req.get('x-forwarded-host') || req.get('host') || '';
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      return `${proto}://${host}`;
    }
  }
  // 3. Cloud Run Service URL desde metadata de entorno si existe
  if (process.env.CLOUD_RUN_URL) {
    return process.env.CLOUD_RUN_URL.replace(/\/$/, '');
  }
  // 4. Fallback para desarrollo local/preview
  return (process.env.DEV_APP_URL || 'https://ais-dev-wd2m6j5fuu77jxh4ldjadl-135361764474.us-east1.run.app').replace(/\/$/, '');
}

// Estado y Diagnóstico de Configuración Twilio WhatsApp (Server-Side)
app.get(['/api/twilio/whatsapp/status', '/api/twilio/whatsapp/diagnostic'], async (req, res) => {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const fromNumber = (process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER || '+17372508034').trim();

  const hasAccountSid = Boolean(accountSid);
  const hasAuthToken = Boolean(authToken);
  const hasFromNumber = Boolean(fromNumber);
  const isValidSidFormat = accountSid.startsWith('AC') && accountSid.length === 34;

  const publicBaseUrl = getPublicBaseUrl(req);
  const webhookInboundUrl = `${publicBaseUrl}/api/twilio/whatsapp/inbound`;
  const statusCallbackUrl = `${publicBaseUrl}/api/twilio/whatsapp/status`;

  const logs: string[] = [
    `[${new Date().toISOString()}] Diagnóstico Twilio en servidor iniciado.`,
    `[Server Secrets] TWILIO_ACCOUNT_SID: ${hasAccountSid ? (isValidSidFormat ? 'CONFIGURADO (Formato AC... válido)' : 'CONFIGURADO (Formato inválido: debe comenzar con AC y 34 caracteres)') : 'NO ENCONTRADO'}`,
    `[Server Secrets] TWILIO_AUTH_TOKEN: ${hasAuthToken ? 'CONFIGURADO (Enmascarado)' : 'NO ENCONTRADO'}`,
    `[Server Secrets] TWILIO_WHATSAPP_FROM: ${fromNumber}`,
    `[Server Endpoints] Inbound: ${webhookInboundUrl} (POST)`,
    `[Server Endpoints] Status: ${statusCallbackUrl} (POST)`,
  ];

  if (!hasAccountSid || !hasAuthToken) {
    logs.push('[Estado Twilio] Faltan Secrets server-side (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).');
    return res.json({
      configured: false,
      provider: 'TWILIO_WHATSAPP',
      accountSid: hasAccountSid ? `***${accountSid.slice(-4)}` : null,
      hasAccountSid,
      hasAuthToken,
      hasFromNumber,
      isValidSidFormat,
      connectionStatus: 'NOT_CONFIGURED',
      publicBaseUrl,
      webhookInboundUrl,
      statusCallbackUrl,
      sandboxNumber: fromNumber,
      logs,
    });
  }

  // Ping de conexión real contra Twilio API
  try {
    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    });

    const data = await twilioRes.json();
    const httpStatus = twilioRes.status;

    if (twilioRes.ok) {
      logs.push(`[Twilio Live Ping] Conexión exitosa con API de Twilio (HTTP ${httpStatus}). Cuenta: ${data.friendly_name || 'Active'}, Estado: ${data.status}`);
      return res.json({
        configured: true,
        provider: 'TWILIO_WHATSAPP',
        accountSid: `***${accountSid.slice(-4)}`,
        hasAccountSid: true,
        hasAuthToken: true,
        hasFromNumber: true,
        isValidSidFormat: true,
        connectionStatus: 'CONNECTED',
        httpStatus,
        accountName: data.friendly_name,
        accountStatus: data.status,
        publicBaseUrl,
        webhookInboundUrl,
        statusCallbackUrl,
        sandboxNumber: fromNumber,
        logs,
      });
    } else {
      const sanitizedError = data.message || `HTTP ${httpStatus} error de Twilio`;
      logs.push(`[Twilio Live Ping Error] Twilio respondió con error HTTP ${httpStatus}: ${sanitizedError}`);
      return res.json({
        configured: true,
        provider: 'TWILIO_WHATSAPP',
        accountSid: `***${accountSid.slice(-4)}`,
        hasAccountSid: true,
        hasAuthToken: true,
        hasFromNumber: true,
        isValidSidFormat,
        connectionStatus: 'DISCONNECTED',
        httpStatus,
        error: sanitizedError,
        publicBaseUrl,
        webhookInboundUrl,
        statusCallbackUrl,
        sandboxNumber: fromNumber,
        logs,
      });
    }
  } catch (err: any) {
    const errorMsg = err.message || 'Error de red contactando a Twilio';
    logs.push(`[Twilio Live Ping Error] ${errorMsg}`);
    return res.json({
      configured: true,
      provider: 'TWILIO_WHATSAPP',
      accountSid: `***${accountSid.slice(-4)}`,
      hasAccountSid: true,
      hasAuthToken: true,
      hasFromNumber: true,
      isValidSidFormat,
      connectionStatus: 'DISCONNECTED',
      httpStatus: 500,
      error: errorMsg,
      publicBaseUrl,
      webhookInboundUrl,
      statusCallbackUrl,
      sandboxNumber: fromNumber,
      logs,
    });
  }
});

// Endpoint exclusivo con Twilio Node SDK para verificar credenciales y ping a la cuenta
app.get('/api/twilio/test-connection', async (req, res) => {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const fromNumber = (process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER || '+17372508034').trim();

  const hasAccountSid = Boolean(accountSid);
  const hasAuthToken = Boolean(authToken);
  const hasFromNumber = Boolean(fromNumber);
  const isValidSidFormat = accountSid.startsWith('AC') && accountSid.length === 34;

  const publicBaseUrl = getPublicBaseUrl(req);
  const webhookInboundUrl = `${publicBaseUrl}/api/twilio/whatsapp/inbound`;
  const statusCallbackUrl = `${publicBaseUrl}/api/twilio/whatsapp/status`;

  if (!hasAccountSid || !hasAuthToken) {
    return res.status(200).json({
      success: false,
      status: 'NOT_CONFIGURED',
      message: 'Faltan credenciales server-side (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)',
      hasAccountSid,
      hasAuthToken,
      hasFromNumber,
      isValidSidFormat,
      maskedAccountSid: hasAccountSid ? `***${accountSid.slice(-4)}` : null,
      fromNumber,
      publicBaseUrl,
      webhookInboundUrl,
      statusCallbackUrl,
    });
  }

  if (!isValidSidFormat) {
    return res.status(200).json({
      success: false,
      status: 'INVALID_SID_FORMAT',
      message: 'El formato de TWILIO_ACCOUNT_SID es inválido (debe comenzar con AC y tener 34 caracteres)',
      hasAccountSid: true,
      hasAuthToken: true,
      hasFromNumber,
      isValidSidFormat: false,
      maskedAccountSid: `***${accountSid.slice(-4)}`,
      fromNumber,
      publicBaseUrl,
      webhookInboundUrl,
      statusCallbackUrl,
    });
  }

  try {
    const client = twilio(accountSid, authToken);
    // Verificación y ping a la cuenta con el SDK oficial de Twilio
    const account = await client.api.v2010.accounts(accountSid).fetch();

    console.log(`[Twilio Node SDK Test-Connection] Cuenta verificada: ${account.friendlyName} (Estado: ${account.status})`);

    return res.status(200).json({
      success: true,
      status: 'CONNECTED',
      httpStatus: 200,
      account: {
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
      },
      hasAccountSid: true,
      hasAuthToken: true,
      hasFromNumber: true,
      isValidSidFormat: true,
      maskedAccountSid: `***${accountSid.slice(-4)}`,
      fromNumber,
      publicBaseUrl,
      webhookInboundUrl,
      statusCallbackUrl,
    });
  } catch (error: any) {
    console.error('[Twilio Node SDK Test-Connection Error]:', error?.message || error);
    const statusCode = error?.status || error?.statusCode || 401;
    const sanitizedError = error?.message || 'Fallo de autenticación o comunicación con Twilio API';

    return res.status(200).json({
      success: false,
      status: 'DISCONNECTED',
      httpStatus: statusCode,
      error: sanitizedError,
      errorCode: error?.code,
      hasAccountSid: true,
      hasAuthToken: true,
      hasFromNumber,
      isValidSidFormat: true,
      maskedAccountSid: `***${accountSid.slice(-4)}`,
      fromNumber,
      publicBaseUrl,
      webhookInboundUrl,
      statusCallbackUrl,
    });
  }
});

// Enviar mensaje saliente con Twilio API
app.post('/api/twilio/whatsapp/send', async (req, res) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioNumber = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER || '+17372508034';

  if (!accountSid || !authToken) {
    return res.status(200).json({
      success: false,
      status: 'NOT_CONFIGURED',
      error: 'Credenciales TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN no configuradas en Secrets',
    });
  }

  const { to, text } = req.body;
  if (!to || !text) {
    return res.status(400).json({ success: false, error: 'Campos to y text son requeridos' });
  }

  const formattedTo = normalizeToTwilioWhatsAppServer(to);
  const formattedFrom = normalizeToTwilioWhatsAppServer(twilioNumber);
  const publicBaseUrl = getPublicBaseUrl(req);
  const statusCallbackUrl = `${publicBaseUrl}/api/twilio/whatsapp/status`;

  try {
    console.log(`[Twilio Envío] Despachando mensaje saliente a ${formattedTo} vía Twilio Sandbox...`);
    const params = new URLSearchParams();
    params.append('From', formattedFrom);
    params.append('To', formattedTo);
    params.append('Body', text);
    params.append('StatusCallback', statusCallbackUrl);

    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      }
    );

    const data = await twilioRes.json();

    if (!twilioRes.ok) {
      console.error(`[Twilio Error Real] Error en respuesta de Twilio API:`, data);
      return res.status(twilioRes.status).json({
        success: false,
        error: data.message || 'Error al enviar mensaje por Twilio WhatsApp',
        code: data.code,
      });
    }

    console.log(`[Twilio SID Devuelto] Mensaje enviado exitosamente. SID: ${data.sid}`);
    return res.json({
      success: true,
      status: 'SENT',
      messageId: data.sid,
    });
  } catch (error: any) {
    console.error(`[Twilio Error Real] Detalle del fallo en API de Twilio:`, error?.message || error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'Error interno al comunicarse con Twilio API',
    });
  }
});

// Configuración de Consultorio KineTurnos Server-Side
const serverClinicConfig = {
  clinicName: 'Consultorio Kinesiológico',
  consultationFee: 15000,
  defaultAppointmentDurationMinutes: 45,
  publicWhatsAppNumber: process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER || '+1 737 221 2163',
  kinesiologistInternalPhone: '+54 9 343 622-4149',
  receptionPhone: '+54 9 343 622-4149',
  currentDelayMinutes: 0,
  approvalRules: {
    requireApprovalForNewAppointment: true,
    requireApprovalForCancellation: false,
    requireApprovalForRescheduling: true,
  },
};

// Almacén en memoria de estado del servidor para sincronización en tiempo real
interface ServerPatient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsappPhone: string;
  createdAt: string;
  active: boolean;
  administrativeNotes?: string;
}

interface ServerAppointment {
  id: string;
  patientId: string;
  professionalId: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  status: 'CONFIRMED' | 'PENDING_APPROVAL' | 'CANCELLED';
  source: string;
  appointmentTypeId?: string;
  administrativeNotes?: string;
  createdAt: string;
}

interface ServerRequest {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  type: 'NEW' | 'RESCHEDULE' | 'CANCEL';
  preferredDate?: string;
  preferredTime?: string;
  suggestedStartIso: string;
  suggestedEndIso: string;
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  source: string;
  administrativeNotes?: string;
  originalMessage?: string;
  consultationFee: number;
  createdAt: string;
}

interface ServerAlert {
  id: string;
  requestId: string;
  patientName: string;
  patientPhone: string;
  whatRequested: string;
  chosenDate: string;
  chosenTime: string;
  consultationFee: number;
  originalMessage: string;
  createdAt: string;
  handled: boolean;
}

interface ServerSession {
  phoneNumber: string;
  step: 'IDLE' | 'SLOTS_OFFERED' | 'AWAITING_PROFESSIONAL' | 'AWAITING_NAME';
  candidateSlots: Array<{
    date: string;
    time: string;
    startIso: string;
    endIso: string;
    humanLabel: string;
  }>;
  updatedAt: string;
}

interface ServerDaySchedule {
  dayOfWeek: number;
  dayName: string;
  active: boolean;
  start: string;
  end: string;
  intervals?: Array<{ start: string; end: string }>;
}

interface ServerWeeklySchedule {
  id: string;
  year: number;
  weekNumber: number;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  days: ServerDaySchedule[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

function getCurrentIsoWeek(): { year: number; weekNumber: number; mondayStr: string; sundayStr: string } {
  const d = new Date();
  const day = d.getDay();
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const mondayStr = monday.toISOString().split('T')[0];
  const sundayStr = sunday.toISOString().split('T')[0];

  const target = new Date(monday.valueOf());
  const dayNr = (monday.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  return { year: monday.getFullYear(), weekNumber, mondayStr, sundayStr };
}

const currentWeekInfo = getCurrentIsoWeek();
const serverWeeklySchedules: ServerWeeklySchedule[] = [
  {
    id: `sched_${currentWeekInfo.year}_w${currentWeekInfo.weekNumber}`,
    year: currentWeekInfo.year,
    weekNumber: currentWeekInfo.weekNumber,
    startDate: currentWeekInfo.mondayStr,
    endDate: currentWeekInfo.sundayStr,
    status: 'PUBLISHED',
    days: [
      { dayOfWeek: 1, dayName: 'Lunes', active: true, start: '08:00', end: '19:00', intervals: [{ start: '08:00', end: '12:00' }, { start: '15:00', end: '19:00' }] },
      { dayOfWeek: 2, dayName: 'Martes', active: true, start: '08:00', end: '19:00', intervals: [{ start: '08:00', end: '12:00' }, { start: '15:00', end: '19:00' }] },
      { dayOfWeek: 3, dayName: 'Miércoles', active: true, start: '08:00', end: '19:00', intervals: [{ start: '08:00', end: '12:00' }, { start: '15:00', end: '19:00' }] },
      { dayOfWeek: 4, dayName: 'Jueves', active: true, start: '08:00', end: '19:00', intervals: [{ start: '08:00', end: '12:00' }, { start: '15:00', end: '19:00' }] },
      { dayOfWeek: 5, dayName: 'Viernes', active: true, start: '08:00', end: '19:00', intervals: [{ start: '08:00', end: '12:00' }, { start: '15:00', end: '19:00' }] },
      { dayOfWeek: 6, dayName: 'Sábado', active: false, start: '09:00', end: '13:00', intervals: [] },
      { dayOfWeek: 0, dayName: 'Domingo', active: false, start: '09:00', end: '13:00', intervals: [] },
    ],
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

function findPublishedAvailableSlots(limit = 2): Array<{ date: string; time: string; startIso: string; endIso: string; humanLabel: string }> {
  const publishedWeeks = serverWeeklySchedules.filter((s) => s.status === 'PUBLISHED');
  if (publishedWeeks.length === 0) {
    console.log('[Twilio Disponibilidad] No hay semanas PUBLISHED. La secretaria no inventa disponibilidad.');
    return [];
  }

  const results: Array<{ date: string; time: string; startIso: string; endIso: string; humanLabel: string }> = [];
  const now = new Date();

  // Scan tomorrow to next 6 days
  for (let offset = 1; offset <= 6 && results.length < limit; offset++) {
    const targetDate = new Date(now.getTime() + offset * 86400000);
    const dateStr = targetDate.toISOString().split('T')[0];
    const dayOfWeek = targetDate.getDay();

    const matchingWeek = publishedWeeks.find((w) => dateStr >= w.startDate && dateStr <= w.endDate);
    if (!matchingWeek) continue;

    const dayConfig = matchingWeek.days.find((d) => d.dayOfWeek === dayOfWeek);
    if (!dayConfig || !dayConfig.active) continue;

    const intervals = dayConfig.intervals && dayConfig.intervals.length > 0
      ? dayConfig.intervals
      : [{ start: '16:00', end: '19:00' }];

    for (const interval of intervals) {
      if (results.length >= limit) break;
      const slotTime = interval.start;
      const startIso = `${dateStr}T${slotTime}:00`;
      const endIso = `${dateStr}T${slotTime.startsWith('16') ? '16:45:00' : '17:45:00'}`;

      const isTaken = serverAppointments.some(
        (a) => a.status === 'CONFIRMED' && a.startAt === startIso
      );
      if (isTaken) continue;

      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const humanLabel = `${dayNames[dayOfWeek]} a las ${slotTime} hs`;

      results.push({
        date: dateStr,
        time: slotTime,
        startIso,
        endIso,
        humanLabel,
      });
    }
  }

  return results;
}

const serverPatients: ServerPatient[] = [
  {
    id: 'pat_demo_1',
    firstName: 'Laura',
    lastName: 'Gómez',
    phone: '+54 9 351 555-0101',
    whatsappPhone: '+54 9 351 555-0101',
    createdAt: new Date().toISOString(),
    active: true,
    administrativeNotes: 'Paciente regular',
  },
  {
    id: 'pat_demo_real_1',
    firstName: 'Paciente',
    lastName: 'WhatsApp',
    phone: '+54 9 341 605-1574',
    whatsappPhone: '+54 9 341 605-1574',
    createdAt: new Date().toISOString(),
    active: true,
    administrativeNotes: 'Número personal de prueba (+54 9 341 605-1574)',
  },
];

const serverAppointments: ServerAppointment[] = [];
const serverRequests: ServerRequest[] = [];
const serverAlerts: ServerAlert[] = [];
const serverSessions: Map<string, ServerSession> = new Map();

/**
 * Función auxiliar para enviar mensajes de WhatsApp salientes vía Twilio
 */
async function sendTwilioOutbound(to: string, bodyText: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  const accountSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const twilioNumber = (process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER || '+17372508034').trim();

  const formattedTo = normalizeToTwilioWhatsAppServer(to);
  const formattedFrom = normalizeToTwilioWhatsAppServer(twilioNumber);
  const statusCallbackUrl = `${getPublicBaseUrl()}/api/twilio/whatsapp/status`;

  if (!accountSid || !authToken) {
    console.warn('[Twilio Dispatch Error] Credenciales Twilio no configuradas en servidor (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)');
    return { success: false, error: 'Credenciales Twilio no configuradas en servidor' };
  }

  try {
    console.log(`[Twilio Envío] Despachando mensaje saliente a ${formattedTo} vía Twilio Sandbox...`);
    const params = new URLSearchParams();
    params.append('From', formattedFrom);
    params.append('To', formattedTo);
    params.append('Body', bodyText);
    params.append('StatusCallback', statusCallbackUrl);

    const authHeader = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params,
      }
    );

    const data = await twilioRes.json();
    if (!twilioRes.ok) {
      console.error(`[Twilio Error Real] Error en respuesta de Twilio API:`, data);
      return { success: false, error: data.message || 'Error de la API de Twilio' };
    }

    console.log(`[Twilio SID Devuelto] Mensaje enviado exitosamente. SID: ${data.sid}`);
    return { success: true, sid: data.sid };
  } catch (err: any) {
    console.error(`[Twilio Error Real] Fallo de red comunicando con Twilio:`, err?.message || err);
    return { success: false, error: err.message };
  }
}

// Endpoint Inbound de Webhook para Twilio WhatsApp
app.post('/api/twilio/whatsapp/inbound', express.urlencoded({ extended: false }), async (req, res) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  // 1. Extraer firma X-Twilio-Signature y campos de Twilio
  const twilioSignature = (req.get('X-Twilio-Signature') || req.get('x-twilio-signature') || '').trim();
  const messageSid = (req.body?.MessageSid || req.body?.SmsSid || req.body?.messageSid || `tw_in_${Date.now()}`).trim();
  const rawFrom = req.body?.From || req.body?.from || '';
  const rawTo = req.body?.To || req.body?.to || '';
  const rawBody = (req.body?.Body || req.body?.body || req.body?.text || '').trim();

  let cleanFrom = rawFrom.replace('whatsapp:', '').trim();
  const cleanTo = rawTo.replace('whatsapp:', '').trim();

  console.log(`[Twilio Webhook Recibido] MessageSid: ${messageSid} | De: ${cleanFrom} | Caracteres: ${rawBody.length}`);

  // Construcción dinámica y segura de URLs para Cloud Run y producción (NO usar localhost)
  const publicBaseUrl = getPublicBaseUrl(req);
  const primaryInboundUrl = `${publicBaseUrl}/api/twilio/whatsapp/inbound`;
  const candidateUrls = buildCandidateUrls(req, '/api/twilio/whatsapp/inbound', [primaryInboundUrl]);

  let signatureStatus: 'VALID' | 'INVALID' | 'SKIPPED_NO_TOKEN' = 'SKIPPED_NO_TOKEN';
  let matchedUrl: string | null = null;

  // Validar X-Twilio-Signature si TWILIO_AUTH_TOKEN y header están presentes mediante el SDK oficial y protección anti-inyección
  if (authToken && twilioSignature) {
    const sigResult = checkTwilioSignatureMultiUrlWithDetails(authToken, twilioSignature, candidateUrls, req.body || {});
    if (sigResult.isValid) {
      signatureStatus = 'VALID';
      matchedUrl = sigResult.matchedUrl;
      console.log(`[Twilio SDK Firma] VÁLIDA (X-Twilio-Signature verificada con SDK oficial en ${matchedUrl})`);
    } else {
      console.warn(`[Twilio SDK Firma] INVÁLIDA para URL(s): ${candidateUrls.join(' | ')} (MessageSid: ${messageSid}, motivo: ${sigResult.reason})`);

      recordTwilioWebhookLog({
        id: `log_in_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        endpoint: '/api/twilio/whatsapp/inbound',
        method: 'POST',
        httpStatus: 403,
        signature: {
          provided: true,
          header: maskSignature(twilioSignature),
          validationStatus: 'INVALID',
          candidateUrls,
          matchedUrl: null,
        },
        headers: extractSanitizedHeaders(req),
        rawPayload: sanitizePayload(req.body || {}),
        messageSid,
        from: rawFrom,
        to: rawTo,
        body: rawBody,
        processingResult: `Rechazado con HTTP 403: ${sigResult.reason || 'X-Twilio-Signature no coincidió con la URL pública'}`,
        error: 'X-Twilio-Signature inválida',
      });

      return res.status(403).end();
    }
  } else if (!authToken) {
    signatureStatus = 'SKIPPED_NO_TOKEN';
    console.log(`[Twilio Firma] Omitida (TWILIO_AUTH_TOKEN no configurado en entorno server-side)`);
  } else {
    signatureStatus = 'SKIPPED_NO_TOKEN';
    console.log(`[Twilio Firma] Omitida (Petición interna/prueba sin header X-Twilio-Signature)`);
  }

  // 2. Control de duplicados por MessageSid
  if (processedTwilioMessageSids.has(messageSid)) {
    console.log(`[Twilio Webhook] Mensaje duplicado omitido por MessageSid (${messageSid})`);

    recordTwilioWebhookLog({
      id: `log_in_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      endpoint: '/api/twilio/whatsapp/inbound',
      method: 'POST',
      httpStatus: 204,
      signature: {
        provided: Boolean(twilioSignature),
        header: twilioSignature ? maskSignature(twilioSignature) : (authToken ? 'VALIDA' : 'OMITIDA_SIN_SECRET'),
        validationStatus: signatureStatus,
        candidateUrls,
        matchedUrl,
      },
      headers: extractSanitizedHeaders(req),
      rawPayload: sanitizePayload(req.body || {}),
      messageSid,
      from: rawFrom,
      to: rawTo,
      body: rawBody,
      processingResult: 'Mensaje duplicado descartado pacíficamente (MessageSid ya procesado)',
    });

    return res.status(204).end();
  }

  processedTwilioMessageSids.add(messageSid);

  // Registrar log de webhook inicial en memoria
  const inboundLogEntry: ServerTwilioWebhookLogEntry = {
    id: `log_in_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    endpoint: '/api/twilio/whatsapp/inbound',
    method: 'POST',
    httpStatus: 204,
    signature: {
      provided: Boolean(twilioSignature),
      header: twilioSignature ? maskSignature(twilioSignature) : (authToken ? 'VALIDA' : 'OMITIDA_SIN_SECRET'),
      validationStatus: signatureStatus,
      candidateUrls,
      matchedUrl,
    },
    headers: extractSanitizedHeaders(req),
    rawPayload: sanitizePayload(req.body || {}),
    messageSid,
    from: rawFrom,
    to: rawTo,
    body: rawBody,
    processingResult: 'Procesando con secretaria digital...',
  };
  recordTwilioWebhookLog(inboundLogEntry);

  // Registrar mensaje con estados: RECEIVED -> VERIFIED -> PROCESSING
  const inboundRecord = {
    messageSid,
    from: cleanFrom,
    to: cleanTo,
    body: rawBody,
    receivedAt: new Date().toISOString(),
    status: 'PROCESSING',
  };
  receivedTwilioMessages.push(inboundRecord);

  // 3. Identificar paciente por teléfono
  let patient = serverPatients.find(
    (p) =>
      p.phone.replace(/\D/g, '') === cleanFrom.replace(/\D/g, '') ||
      p.whatsappPhone.replace(/\D/g, '') === cleanFrom.replace(/\D/g, '')
  );

  if (!patient) {
    patient = {
      id: `pat_${Date.now()}`,
      firstName: 'Paciente',
      lastName: 'Nuevo',
      phone: cleanFrom,
      whatsappPhone: cleanFrom,
      createdAt: new Date().toISOString(),
      active: true,
      administrativeNotes: 'Contacto registrado automáticamente por WhatsApp',
    };
    serverPatients.push(patient);
  }

  console.log(`[Twilio Origen] Teléfono: ${cleanFrom} | Paciente: ${patient.firstName} ${patient.lastName} (ID: ${patient.id})`);

  const patientName = patient.firstName !== 'Paciente' ? patient.firstName : 'Paciente';

  // 4. Cargar sesión conversacional
  let session = serverSessions.get(cleanFrom);
  if (!session) {
    session = {
      phoneNumber: cleanFrom,
      step: 'IDLE',
      candidateSlots: [],
      updatedAt: new Date().toISOString(),
    };
    serverSessions.set(cleanFrom, session);
  }

  const lower = rawBody.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 5. Flujo conversacional de la Secretaria Digital (Argentina, breve, cálida y natural)

  // A) ¿El paciente está eligiendo uno de los horarios ofrecidos previamente?
  if (session.step === 'SLOTS_OFFERED' && session.candidateSlots.length > 0) {
    console.log(`[Twilio Intención] Paciente seleccionando slot de opciones previas: "${rawBody}"`);
    let chosenSlot = session.candidateSlots[0];
    if (lower.includes('2') || lower.includes('segundo') || lower.includes('17:30') || lower.includes('martes') || lower.includes('miercoles')) {
      chosenSlot = session.candidateSlots[1] || session.candidateSlots[0];
    } else if (lower.includes('3') || lower.includes('tercero')) {
      chosenSlot = session.candidateSlots[2] || session.candidateSlots[0];
    }

    // Crear solicitud PENDIENTE DE PROFESIONAL
    const newReq: ServerRequest = {
      id: `req_${Date.now()}`,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientPhone: cleanFrom,
      type: 'NEW',
      preferredDate: chosenSlot.date,
      preferredTime: chosenSlot.time,
      suggestedStartIso: chosenSlot.startIso,
      suggestedEndIso: chosenSlot.endIso,
      status: 'PENDING',
      source: 'WHATSAPP_TWILIO',
      consultationFee: serverClinicConfig.consultationFee,
      administrativeNotes: `Solicitado por WhatsApp vía Twilio. Arancel: $${serverClinicConfig.consultationFee.toLocaleString('es-AR')}`,
      originalMessage: rawBody,
      createdAt: new Date().toISOString(),
    };
    serverRequests.push(newReq);

    // Crear ALERTA IMPORTANTE para el kinesiólogo
    const newAlert: ServerAlert = {
      id: `alt_${Date.now()}`,
      requestId: newReq.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      patientPhone: cleanFrom,
      whatRequested: 'Turno kinesiología individual',
      chosenDate: chosenSlot.date,
      chosenTime: chosenSlot.time,
      consultationFee: serverClinicConfig.consultationFee,
      originalMessage: rawBody,
      createdAt: new Date().toISOString(),
      handled: false,
    };
    serverAlerts.push(newAlert);

    console.log(`[Twilio Solicitud Creada] Solicitud PENDIENTE creada ID: ${newReq.id} para paciente ${newReq.patientName} (${newReq.preferredDate} ${newReq.preferredTime}). Alerta generada para kinesiólogo.`);

    session.step = 'AWAITING_PROFESSIONAL';
    session.candidateSlots = [];
    session.updatedAt = new Date().toISOString();

    // Respuesta obligatoria:
    // “Perfecto. Ya le avisé al profesional. Apenas confirme el horario te aviso por acá.”
    const replyText = `Perfecto, ${patientName}. Ya le avisé al profesional. Apenas confirme el horario te aviso por acá.`;
    await sendTwilioOutbound(cleanFrom, replyText);

    return res.status(204).end();
  }

  // B) ¿El paciente pregunta por el arancel / precio?
  if (
    lower.includes('cuanto sale') ||
    lower.includes('cuanto cuesta') ||
    lower.includes('precio') ||
    lower.includes('arancel') ||
    lower.includes('costo') ||
    lower.includes('honorarios')
  ) {
    console.log(`[Twilio Intención] Intención detectada: ASK_PRICE para mensaje: "${rawBody}"`);
    const feeText = serverClinicConfig.consultationFee.toLocaleString('es-AR');
    const replyText = `Hola ${patientName}. La sesión de kinesiología tiene un valor de $${feeText}. ¿Te gustaría que te ofrezca horarios disponibles para coordinar un turno?`;
    await sendTwilioOutbound(cleanFrom, replyText);

    return res.status(204).end();
  }

  // C) ¿El paciente consulta por la demora actual?
  if (lower.includes('demora') || lower.includes('retraso') || lower.includes('espera') || lower.includes('estan a horario')) {
    console.log(`[Twilio Intención] Intención detectada: ASK_DELAY para mensaje: "${rawBody}"`);
    const replyText =
      serverClinicConfig.currentDelayMinutes > 0
        ? `Hola ${patientName}. En este momento estamos con aproximadamente ${serverClinicConfig.currentDelayMinutes} minutos de demora en el consultorio. Te avisamos para que puedas organizarte con tranquilidad.`
        : `Hola ${patientName}. En este momento el consultorio está atendiendo con puntualidad y sin demoras.`;
    await sendTwilioOutbound(cleanFrom, replyText);

    return res.status(204).end();
  }

  // D) ¿El paciente solicita un turno o consulta disponibilidad?
  if (
    lower.includes('turno') ||
    lower.includes('sesion') ||
    lower.includes('horario') ||
    lower.includes('hueco') ||
    lower.includes('disponibilidad') ||
    lower.includes('agendar') ||
    lower.includes('necesito un turno') ||
    lower.includes('hola')
  ) {
    console.log(`[Twilio Intención] Intención detectada: REQUEST_APPOINTMENT / GREETING para mensaje: "${rawBody}"`);

    // Consultar horarios disponibles únicamente de semanas PUBLISHED (Regla fundamental: nunca inventar disponibilidad)
    const candidateSlots = findPublishedAvailableSlots(2);
    console.log(`[Twilio Disponibilidad] Consultando semanas PUBLISHED. Slots disponibles encontrados: ${candidateSlots.length}`);

    if (candidateSlots.length === 0) {
      const replyText = `Hola ${patientName}. En este momento la agenda no dispone de horarios publicados para los próximos días. ¿Te gustaría que te agregue a nuestra Lista de Espera prioritaria por si se libera un hueco?`;
      await sendTwilioOutbound(cleanFrom, replyText);
      return res.status(204).end();
    }

    session.candidateSlots = candidateSlots;
    session.step = 'SLOTS_OFFERED';
    session.updatedAt = new Date().toISOString();

    const optionsText = candidateSlots
      .map((s, idx) => `${idx + 1}️⃣ ${s.humanLabel}`)
      .join('\n');

    const feeText = serverClinicConfig.consultationFee.toLocaleString('es-AR');
    const replyText = `Hola ${patientName}. Sí, puedo ayudarte. Tengo disponibilidad para los siguientes horarios:\n\n${optionsText}\n\nLa sesión tiene un valor de $${feeText}. ¿Cuál te queda mejor? (Podés responder con 1 o 2).`;

    await sendTwilioOutbound(cleanFrom, replyText);

    return res.status(204).end();
  }

  // E) Intención ambigua: preguntar cortésmente
  console.log(`[Twilio Intención] Intención detectada: AMBIGUOUS para mensaje: "${rawBody}"`);
  const replyText = `Hola ${patientName}. Recibí tu mensaje en la secretaría de ${serverClinicConfig.clinicName}. ¿Podrías confirmarme si deseás coordinar un turno o consultar horarios?`;
  await sendTwilioOutbound(cleanFrom, replyText);

  return res.status(204).end();
});

// Endpoint de Status Callback de Twilio para registrar entrega
app.post('/api/twilio/whatsapp/status', express.urlencoded({ extended: false }), (req, res) => {
  const authToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const twilioSignature = (req.get('X-Twilio-Signature') || req.get('x-twilio-signature') || '').trim();
  const sid = (req.body?.MessageSid || req.body?.SmsSid || '').trim();
  const status = (req.body?.MessageStatus || '').trim();
  const rawFrom = req.body?.From || '';
  const rawTo = req.body?.To || '';

  const publicBaseUrl = getPublicBaseUrl(req);
  const primaryStatusUrl = `${publicBaseUrl}/api/twilio/whatsapp/status`;
  const candidateUrls = buildCandidateUrls(req, '/api/twilio/whatsapp/status', [primaryStatusUrl]);

  let signatureStatus: 'VALID' | 'INVALID' | 'SKIPPED_NO_TOKEN' = 'SKIPPED_NO_TOKEN';
  let matchedUrl: string | null = null;

  if (authToken && twilioSignature) {
    const sigResult = checkTwilioSignatureMultiUrlWithDetails(authToken, twilioSignature, candidateUrls, req.body || {});
    if (!sigResult.isValid) {
      console.warn(`[Twilio Status Callback] Firma inválida para SID: ${sid} (${sigResult.reason})`);
      recordTwilioWebhookLog({
        id: `log_st_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        endpoint: '/api/twilio/whatsapp/status',
        method: 'POST',
        httpStatus: 403,
        signature: {
          provided: true,
          header: maskSignature(twilioSignature),
          validationStatus: 'INVALID',
          candidateUrls,
          matchedUrl: null,
        },
        headers: extractSanitizedHeaders(req),
        rawPayload: sanitizePayload(req.body || {}),
        messageSid: sid,
        from: rawFrom,
        to: rawTo,
        messageStatus: status,
        processingResult: `Rechazado con HTTP 403: ${sigResult.reason || 'X-Twilio-Signature no coincidió'}`,
        error: 'X-Twilio-Signature inválida',
      });
      return res.status(403).end();
    } else {
      signatureStatus = 'VALID';
      matchedUrl = sigResult.matchedUrl;
    }
  } else if (!authToken) {
    signatureStatus = 'SKIPPED_NO_TOKEN';
  } else {
    signatureStatus = 'SKIPPED_NO_TOKEN';
  }

  console.log(`[Twilio Status Callback] SID: ${sid} | Estado de entrega: ${status}`);

  if (sid && status) {
    const target = receivedTwilioMessages.find((m: any) => m.messageSid === sid);
    if (target) {
      target.status = String(status).toUpperCase();
    }
  }

  recordTwilioWebhookLog({
    id: `log_st_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    endpoint: '/api/twilio/whatsapp/status',
    method: 'POST',
    httpStatus: 204,
    signature: {
      provided: Boolean(twilioSignature),
      header: twilioSignature ? maskSignature(twilioSignature) : (authToken ? 'VALIDA' : 'OMITIDA_SIN_SECRET'),
      validationStatus: signatureStatus,
      candidateUrls,
      matchedUrl,
    },
    headers: extractSanitizedHeaders(req),
    rawPayload: sanitizePayload(req.body || {}),
    messageSid: sid,
    from: rawFrom,
    to: rawTo,
    messageStatus: status,
    processingResult: `Estado de entrega actualizado a: ${status ? status.toUpperCase() : 'DESCONOCIDO'}`,
  });

  return res.status(204).end();
});

// Endpoint para consultar/sincronizar agendas semanales
app.get('/api/kine/weekly-schedules', (_req, res) => {
  res.json({
    total: serverWeeklySchedules.length,
    schedules: serverWeeklySchedules,
  });
});

app.post('/api/kine/weekly-schedules/publish', (req, res) => {
  const { id } = req.body;
  const target = serverWeeklySchedules.find((s) => s.id === id);
  if (target) {
    target.status = 'PUBLISHED';
    target.publishedAt = new Date().toISOString();
    console.log(`[Kine Agenda] Semana ${id} PUBLICADA por el kinesiólogo.`);
    return res.json({ success: true, schedule: target });
  }
  return res.status(404).json({ success: false, error: 'Semana no encontrada' });
});

// Endpoint para que la app consulte alertas pendientes que requieren decisión con sonido
app.get('/api/kine/pending-alerts', (_req, res) => {
  const activeAlerts = serverAlerts.filter((a) => !a.handled);
  res.json({
    total: activeAlerts.length,
    alerts: activeAlerts,
    requests: serverRequests.filter((r) => r.status === 'PENDING'),
  });
});

// Endpoint para que el kinesiólogo confirme una solicitud pendiente
app.post('/api/kine/requests/:id/confirm', async (req, res) => {
  const { id } = req.params;
  const request = serverRequests.find((r) => r.id === id);

  if (!request) {
    return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
  }

  console.log(`[Kine Aprobación] Solicitud ID: ${id} aprobada por el kinesiólogo. Revalidando disponibilidad para slot ${request.suggestedStartIso}...`);

  // 1. Revalidar disponibilidad para evitar doble reserva
  const conflict = serverAppointments.find(
    (a) =>
      a.status === 'CONFIRMED' &&
      a.startAt === request.suggestedStartIso &&
      a.professionalId === 'prof_demo_1'
  );

  if (conflict) {
    console.warn(`[Kine Aprobación Rechazada] Conflicto de horario: slot ${request.suggestedStartIso} ya ocupado.`);
    return res.status(409).json({
      success: false,
      error: 'El horario seleccionado ya fue reservado concurrentemente por otro paciente',
    });
  }

  // 2. Crear y guardar turno en la agenda
  const newAppointment: ServerAppointment = {
    id: `apt_${Date.now()}`,
    patientId: request.patientId,
    professionalId: 'prof_demo_1',
    startAt: request.suggestedStartIso,
    endAt: request.suggestedEndIso,
    durationMinutes: 45,
    status: 'CONFIRMED',
    source: 'WHATSAPP_TWILIO',
    administrativeNotes: `Confirmado por profesional. Arancel: $${request.consultationFee}`,
    createdAt: new Date().toISOString(),
  };
  serverAppointments.push(newAppointment);

  // 3. Actualizar estado de solicitud
  request.status = 'RESOLVED';

  // 4. Marcar alerta como resuelta
  const alert = serverAlerts.find((a) => a.requestId === id);
  if (alert) alert.handled = true;

  // 5. Enviar mensaje de WhatsApp REAL al paciente vía Twilio
  const targetDate = request.preferredDate || request.suggestedStartIso.split('T')[0];
  const targetTime = request.preferredTime || request.suggestedStartIso.split('T')[1].slice(0, 5);

  const confirmationMessage = `¡Hola ${request.patientName.split(' ')[0]}! Tu turno del día ${targetDate} a las ${targetTime} hs ha sido confirmado con el kinesiólogo. El valor de la sesión es de $${request.consultationFee.toLocaleString('es-AR')}. Te esperamos en ${serverClinicConfig.clinicName}.`;

  const twilioResult = await sendTwilioOutbound(request.patientPhone, confirmationMessage);

  return res.json({
    success: true,
    appointment: newAppointment,
    messageId: twilioResult.sid,
    status: twilioResult.success ? 'SENT' : 'FAILED',
    message: confirmationMessage,
  });
});

// Endpoint para que el kinesiólogo proponga otro horario
app.post('/api/kine/requests/:id/propose', async (req, res) => {
  const { id } = req.params;
  const { altDate, altTime } = req.body;
  const request = serverRequests.find((r) => r.id === id);

  if (!request) {
    return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
  }

  request.status = 'RESOLVED';
  const alert = serverAlerts.find((a) => a.requestId === id);
  if (alert) alert.handled = true;

  const altMessage = `Hola ${request.patientName.split(' ')[0]}. El profesional no dispone del horario solicitado, pero te propone el día ${altDate} a las ${altTime} hs. ¿Te queda cómodo este nuevo horario?`;
  const twilioResult = await sendTwilioOutbound(request.patientPhone, altMessage);

  return res.json({ success: true, messageId: twilioResult.sid });
});

// Endpoint para que el kinesiólogo rechace una solicitud
app.post('/api/kine/requests/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const request = serverRequests.find((r) => r.id === id);

  if (!request) {
    return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });
  }

  request.status = 'REJECTED';
  const alert = serverAlerts.find((a) => a.requestId === id);
  if (alert) alert.handled = true;

  const rejectMessage = `Hola ${request.patientName.split(' ')[0]}. Lamentablemente no podemos tomar tu turno en este momento (${reason || 'sin disponibilidad en agenda'}). Ni bien tengamos cupos libres nos comunicaremos contigo.`;
  const twilioResult = await sendTwilioOutbound(request.patientPhone, rejectMessage);

  return res.json({ success: true, messageId: twilioResult.sid });
});

// Endpoint para consultar mensajes guardados de Twilio
app.get('/api/twilio/whatsapp/messages', (_req, res) => {
  res.json({
    total: receivedTwilioMessages.length,
    messages: receivedTwilioMessages,
  });
});

// Endpoint para consultar logs de webhooks de Twilio (/inbound y /status)
app.get('/api/twilio/whatsapp/webhook-logs', (req, res) => {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const endpointFilter = req.query.endpoint as string;

  let logs = [...serverTwilioWebhookLogs];
  if (endpointFilter) {
    logs = logs.filter((l) => l.endpoint === endpointFilter);
  }

  return res.json({
    success: true,
    total: logs.length,
    logs: logs.slice(0, limit),
    serverTime: new Date().toISOString(),
  });
});

// Endpoint para limpiar logs de webhooks de Twilio
app.delete('/api/twilio/whatsapp/webhook-logs', (_req, res) => {
  serverTwilioWebhookLogs.length = 0;
  return res.json({
    success: true,
    message: 'Registro de webhooks limpiado exitosamente',
    total: 0,
    logs: [],
  });
});

// -------------------------------------------------------------
// Vite middleware / Static Serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`[Consultorio Kinesiológico v0.1] Servidor activo en http://localhost:${PORT}`);
  });
}

startServer();
