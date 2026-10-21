/**
 * @file MetaWhatsAppService.ts
 * @description Servicio de envío de mensajes con la API oficial de Meta WhatsApp Cloud API.
 * 
 * REGLA DE SEGURIDAD ABSOLUTA:
 * Este servicio NO contiene ni expone tokens de Meta (META_WHATSAPP_ACCESS_TOKEN / META_WHATSAPP_PHONE_NUMBER_ID)
 * en el código de cliente/React. Delegará todas las peticiones al backend Express en `/api/whatsapp/*`.
 */

import { formatWhatsAppPhone } from '../../utils/whatsappUtils.ts';

export interface MetaSendResult {
  success: boolean;
  messageId?: string;
  status?: string;
  error?: string;
  details?: any;
}

export interface MetaWhatsAppStatus {
  configured: boolean;
  provider: 'META_CLOUD_API' | 'CLICK_TO_CHAT_FALLBACK';
  phoneNumberId?: string | null;
}

export class MetaWhatsAppService {
  /**
   * Ejecuta el diagnóstico de conectividad server-side para verificar META_WHATSAPP_ACCESS_TOKEN
   * y META_WHATSAPP_PHONE_NUMBER_ID sin exponer secretos en el cliente.
   */
  static async runServerDiagnostic(): Promise<{
    status: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
    configured: boolean;
    logs: string[];
    connectionDetails: any;
  }> {
    try {
      const response = await fetch('/api/whatsapp/diagnostic');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      console.error('[MetaWhatsAppService] Error en diagnóstico server-side:', err);
      return {
        status: 'ERROR',
        configured: false,
        logs: [
          `[${new Date().toISOString()}] Error de red al comunicar con /api/whatsapp/diagnostic.`,
          `Detalle: ${err.message || err}`,
        ],
        connectionDetails: { provider: 'ERROR' },
      };
    }
  }
  static async getStatus(): Promise<MetaWhatsAppStatus> {
    try {
      const response = await fetch('/api/whatsapp/status');
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      return await response.json();
    } catch (err: any) {
      console.warn('[MetaWhatsAppService] Error consultando estado del servidor:', err);
      return {
        configured: false,
        provider: 'CLICK_TO_CHAT_FALLBACK',
      };
    }
  }

  /**
   * Envía un mensaje de texto libre a un número telefónico vía la API Oficial de Meta Cloud
   */
  static async sendTextMessage(toPhone: string, text: string): Promise<MetaSendResult> {
    const formattedPhone = formatWhatsAppPhone(toPhone);

    if (!formattedPhone) {
      return {
        success: false,
        error: 'El número de teléfono proporcionado no es válido',
      };
    }

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedPhone,
          type: 'text',
          text,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || data.reason || `Error de servidor (${response.status})`,
          details: data,
        };
      }

      return {
        success: true,
        messageId: data.messageId,
        status: data.status || 'SENT',
      };
    } catch (err: any) {
      console.error('[MetaWhatsAppService] Error de red al enviar mensaje de texto:', err);
      return {
        success: false,
        error: err.message || 'Error de conexión con el servidor backend de KineTurnos',
      };
    }
  }

  /**
   * Envía una plantilla (HSM) oficial de WhatsApp a un número telefónico
   */
  static async sendTemplateMessage(
    toPhone: string,
    templateName: string,
    params: Record<string, string> = {},
    languageCode: string = 'es'
  ): Promise<MetaSendResult> {
    const formattedPhone = formatWhatsAppPhone(toPhone);

    if (!formattedPhone) {
      return {
        success: false,
        error: 'El número de teléfono proporcionado no es válido',
      };
    }

    try {
      const response = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: formattedPhone,
          type: 'template',
          templateName,
          params,
          languageCode,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || data.reason || `Error de servidor (${response.status})`,
          details: data,
        };
      }

      return {
        success: true,
        messageId: data.messageId,
        status: data.status || 'SENT',
      };
    } catch (err: any) {
      console.error('[MetaWhatsAppService] Error de red al enviar plantilla:', err);
      return {
        success: false,
        error: err.message || 'Error de conexión al enviar plantilla oficial',
      };
    }
  }

  /**
   * Envía la plantilla de prueba estándar 'hello_world' aprobada por Meta
   */
  static async sendTestHelloWorld(toPhone: string): Promise<MetaSendResult> {
    try {
      const response = await fetch('/api/whatsapp/send-test-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toPhone }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data.error || `Error en envío de plantilla de prueba (${response.status})`,
          details: data.details || data,
        };
      }

      return {
        success: true,
        messageId: data.messageId,
        details: data.details,
      };
    } catch (err: any) {
      console.error('[MetaWhatsAppService] Error al enviar hello_world:', err);
      return {
        success: false,
        error: err.message || 'Error de comunicación con el servidor',
      };
    }
  }
}
