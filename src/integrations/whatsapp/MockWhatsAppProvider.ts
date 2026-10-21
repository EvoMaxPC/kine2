import { IWhatsAppProvider } from './IWhatsAppProvider.ts';
import { IConversationRepository } from '../../repositories/IConversationRepository.ts';

export class MockWhatsAppProvider implements IWhatsAppProvider {
  constructor(private conversationRepo?: IConversationRepository) {}

  async sendTextMessage(
    toPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId: string; status: 'PREPARED_FOR_WHATSAPP' }> {
    const messageId = `mock_wa_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // In Phase 1 DEMO, this represents a message queued & prepared for future WhatsApp dispatch
    console.log(`[MockWhatsAppProvider] Preparado para WhatsApp (${toPhone}): "${text}"`);

    return {
      success: true,
      messageId,
      status: 'PREPARED_FOR_WHATSAPP',
    };
  }

  async sendMessage(
    toPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId: string; status: 'PREPARED_FOR_WHATSAPP' }> {
    return this.sendTextMessage(toPhone, text);
  }

  async sendTemplateMessage(
    toPhone: string,
    templateName: string,
    params: Record<string, string>
  ): Promise<{ success: boolean; messageId: string }> {
    const messageId = `mock_tpl_${Date.now()}`;
    console.log(`[MockWhatsAppProvider] Template "${templateName}" preparado para ${toPhone}`, params);
    return { success: true, messageId };
  }

  async markAsRead(externalMessageId: string): Promise<void> {
    console.log(`[MockWhatsAppProvider] Mensaje ${externalMessageId} marcado como leído.`);
  }
}
