/**
 * @file FreeWhatsAppProvider.ts
 * @description Proveedor de WhatsApp para KineTurnos basado en enlaces oficiales de WhatsApp Click-to-Chat.
 */

import { IWhatsAppProvider } from './IWhatsAppProvider.ts';
import { IConversationRepository } from '../../repositories/IConversationRepository.ts';
import { formatWhatsAppPhone, generateWhatsAppUrl, openWhatsAppChat } from '../../utils/whatsappUtils.ts';
import { ConversationMessage } from '../../types/index.ts';

export interface FreeWhatsAppOptions {
  autoOpenChat?: boolean;
  defaultCountryCode?: string;
}

export class FreeWhatsAppProvider implements IWhatsAppProvider {
  constructor(
    private conversationRepo?: IConversationRepository,
    private defaultOptions: FreeWhatsAppOptions = { autoOpenChat: false, defaultCountryCode: '54' }
  ) {}

  /**
   * Prepara / Genera el enlace directo Click-to-Chat de WhatsApp
   */
  async sendTextMessage(
    toPhone: string,
    text: string,
    options?: FreeWhatsAppOptions
  ): Promise<{ success: boolean; messageId: string; status: 'SENT' | 'PREPARED_FOR_WHATSAPP'; whatsappUrl: string }> {
    const formattedPhone = formatWhatsAppPhone(toPhone, options?.defaultCountryCode || this.defaultOptions.defaultCountryCode || '54');
    const whatsappUrl = generateWhatsAppUrl(formattedPhone, text);
    const messageId = `wa_click_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const autoOpen = options?.autoOpenChat ?? this.defaultOptions.autoOpenChat;

    if (autoOpen) {
      openWhatsAppChat(formattedPhone, text);
    }

    if (this.conversationRepo) {
      try {
        await this.conversationRepo.recordMessage({
          patientId: formattedPhone,
          direction: 'OUTBOUND',
          messageType: 'TEXT',
          content: text,
          status: 'PREPARED_FOR_WHATSAPP',
          externalMessageId: messageId,
        });
      } catch (e) {
        console.warn('[FreeWhatsAppProvider] No se pudo persistir en conversationRepo:', e);
      }
    }

    console.log(`[FreeWhatsAppProvider] Mensaje preparado para WhatsApp (${formattedPhone}):`, {
      url: whatsappUrl,
      text,
    });

    return {
      success: true,
      messageId,
      status: 'PREPARED_FOR_WHATSAPP',
      whatsappUrl,
    };
  }

  async sendMessage(
    toPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId: string; status: 'SENT' | 'PREPARED_FOR_WHATSAPP'; whatsappUrl: string }> {
    return this.sendTextMessage(toPhone, text);
  }

  async sendTemplateMessage(
    toPhone: string,
    templateName: string,
    params: Record<string, string>
  ): Promise<{ success: boolean; messageId: string; whatsappUrl?: string }> {
    let text = `[${templateName}] `;
    if (params.patientName) text += `Hola ${params.patientName}, `;
    if (params.date && params.time) text += `le recordamos su turno de kinesiología el ${params.date} a las ${params.time} hs.`;
    else if (params.body) text += params.body;

    const res = await this.sendTextMessage(toPhone, text);
    return { success: true, messageId: res.messageId, whatsappUrl: res.whatsappUrl };
  }

  async markAsRead(externalMessageId: string): Promise<void> {
    console.log(`[FreeWhatsAppProvider] Mensaje ${externalMessageId} marcado como leído.`);
  }
}

