/**
 * @file MetaWhatsAppProvider.ts
 * @description Future Phase 2 WhatsApp Business Cloud API Integration.
 * 
 * CRITICAL SECURITY ARCHITECTURE (SERVER SIDE ONLY):
 * Never embed Meta Business API tokens, System User secrets, Phone Number IDs,
 * or Webhook verification secrets inside client/frontend bundles.
 * 
 * In Phase 2:
 * 1. Webhook endpoint lives on Express/Cloud Run (/api/webhooks/whatsapp).
 * 2. Inbound messages are verified using HMAC-SHA256 signature against App Secret.
 * 3. Outbound messages use Graph API (https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages)
 *    authorized by server-side Bearer token stored in Secret Manager.
 */

import { IWhatsAppProvider } from './IWhatsAppProvider.ts';

export class MetaWhatsAppProvider implements IWhatsAppProvider {
  async sendTextMessage(
    toPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId: string; status: 'SENT' }> {
    throw new Error(
      'MetaWhatsAppProvider: Integración en desarrollo para Fase 2. Usar MockWhatsAppProvider en Fase 1.'
    );
  }

  async sendMessage(
    toPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId: string; status: 'SENT' }> {
    return this.sendTextMessage(toPhone, text);
  }

  async sendTemplateMessage(
    toPhone: string,
    templateName: string,
    params: Record<string, string>
  ): Promise<{ success: boolean; messageId: string }> {
    throw new Error('MetaWhatsAppProvider: No aprovisionado en Fase 1.');
  }

  async markAsRead(externalMessageId: string): Promise<void> {
    throw new Error('MetaWhatsAppProvider: No aprovisionado en Fase 1.');
  }
}
