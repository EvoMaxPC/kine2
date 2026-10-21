/**
 * @file TwilioWhatsAppService.ts
 * @description Servicio cliente de integración con Twilio WhatsApp API.
 * 
 * REGLA DE SEGURIDAD ABSOLUTA:
 * Este servicio NO contiene ni expone credenciales de Twilio (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, etc.)
 * en el código de cliente/React. Delegará todas las peticiones al backend Express en `/api/twilio/whatsapp/*`.
 */

import { formatWhatsAppPhone } from '../../utils/whatsappUtils.ts';

export interface TwilioSendResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  code?: number;
  details?: any;
}

export interface TwilioWhatsAppStatus {
  configured: boolean;
  provider: string;
  accountSid?: string | null;
  hasAccountSid?: boolean;
  hasAuthToken?: boolean;
  hasFromNumber?: boolean;
  isValidSidFormat?: boolean;
  connectionStatus?: 'CONNECTED' | 'DISCONNECTED' | 'NOT_CONFIGURED';
  httpStatus?: number;
  accountName?: string;
  accountStatus?: string;
  error?: string;
  logs?: string[];
  publicBaseUrl?: string;
  webhookInboundUrl?: string;
  statusCallbackUrl?: string;
  sandboxNumber?: string;
}

export interface TwilioInboundMessage {
  messageSid: string;
  from: string;
  to: string;
  body: string;
  receivedAt: string;
}

export class TwilioWhatsAppService {
  /**
   * Consulta el estado de configuración y diagnóstico de Twilio en el servidor Express
   */
  static async getStatus(): Promise<TwilioWhatsAppStatus> {
    try {
      const response = await fetch('/api/twilio/whatsapp/diagnostic');
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      console.warn('[TwilioWhatsAppService] Error consultando estado del servidor:', err);
      return {
        configured: false,
        provider: 'TWILIO_WHATSAPP',
        connectionStatus: 'NOT_CONFIGURED',
        logs: [`[Error] No se pudo comunicar con el servidor backend: ${err.message}`],
      };
    }
  }

  /**
   * Ejecuta diagnóstico completo de conectividad con Twilio
   */
  static async runDiagnostic(): Promise<TwilioWhatsAppStatus> {
    return this.getStatus();
  }

  /**
   * Verifica credenciales y ping a la cuenta mediante el endpoint que utiliza Twilio Node SDK
   */
  static async testConnectionSDK(): Promise<{
    success: boolean;
    status: string;
    httpStatus?: number;
    account?: { friendlyName: string; status: string; type: string };
    error?: string;
    maskedAccountSid?: string | null;
    webhookInboundUrl?: string;
    statusCallbackUrl?: string;
  }> {
    try {
      const response = await fetch('/api/twilio/test-connection');
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      console.warn('[TwilioWhatsAppService] Error en test-connection:', err);
      return {
        success: false,
        status: 'DISCONNECTED',
        error: err.message || 'Error comunicando con endpoint /api/twilio/test-connection',
      };
    }
  }

  /**
   * Envía un mensaje de texto libre a un número telefónico vía la API oficial de Twilio WhatsApp
   */
  static async sendTextMessage(toPhone: string, text: string): Promise<TwilioSendResult> {
    const formattedPhone = formatWhatsAppPhone(toPhone);

    if (!formattedPhone) {
      return {
        success: false,
        error: 'El número de teléfono proporcionado no es válido',
      };
    }

    try {
      const response = await fetch('/api/twilio/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedPhone,
          text,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || data.reason || `Error de servidor (${response.status})`,
          code: data.code,
          details: data,
        };
      }

      return {
        success: true,
        messageId: data.messageId,
        status: data.status || 'SENT',
      };
    } catch (err: any) {
      console.error('[TwilioWhatsAppService] Error de red al enviar mensaje:', err);
      return {
        success: false,
        error: err.message || 'Error de conexión con el servidor backend de KineTurnos',
      };
    }
  }

  /**
   * Consulta los mensajes de WhatsApp entrantes recibidos vía Webhook de Twilio
   */
  static async getInboundMessages(): Promise<{ total: number; messages: TwilioInboundMessage[] }> {
    try {
      const response = await fetch('/api/twilio/whatsapp/messages');
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      console.error('[TwilioWhatsAppService] Error al obtener mensajes entrantes:', err);
      return { total: 0, messages: [] };
    }
  }
}
