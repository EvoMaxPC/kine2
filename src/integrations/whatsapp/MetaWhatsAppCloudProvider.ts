import { IWhatsAppProvider } from './IWhatsAppProvider.ts';
import { FreeWhatsAppProvider } from './FreeWhatsAppProvider.ts';
import { IConversationRepository } from '../../repositories/IConversationRepository.ts';
import { formatWhatsAppPhone } from '../../utils/whatsappUtils.ts';

export class MetaWhatsAppCloudProvider implements IWhatsAppProvider {
  private fallbackProvider: FreeWhatsAppProvider;

  constructor(private conversationRepo?: IConversationRepository) {
    this.fallbackProvider = new FreeWhatsAppProvider(conversationRepo);
  }

  async sendTextMessage(
    toPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId: string; status: 'PREPARED_FOR_WHATSAPP' | 'SENT'; whatsappUrl?: string }> {
    const formattedPhone = formatWhatsAppPhone(toPhone);

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

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.status === 'SENT') {
          if (this.conversationRepo) {
            try {
              await this.conversationRepo.recordMessage({
                patientId: formattedPhone,
                direction: 'OUTBOUND',
                messageType: 'TEXT',
                content: text,
                status: 'SENT',
                externalMessageId: data.messageId,
              });
            } catch (err) {
              console.warn('[MetaWhatsAppCloudProvider] No se pudo persistir en conversationRepo:', err);
            }
          }
          return {
            success: true,
            messageId: data.messageId,
            status: 'SENT',
          };
        }
      }
    } catch (error) {
      console.warn('[MetaWhatsAppCloudProvider] Error comunicando con backend Express, usando fallback Click-to-Chat:', error);
    }

    // Fallback gracioso a Click-to-Chat / FreeWhatsAppProvider
    return this.fallbackProvider.sendTextMessage(formattedPhone, text);
  }

  async sendMessage(
    toPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId: string; status: 'PREPARED_FOR_WHATSAPP' | 'SENT'; whatsappUrl?: string }> {
    return this.sendTextMessage(toPhone, text);
  }

  async sendTemplateMessage(
    toPhone: string,
    templateName: string,
    params: Record<string, string>
  ): Promise<{ success: boolean; messageId: string; whatsappUrl?: string }> {
    const formattedPhone = formatWhatsAppPhone(toPhone);

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
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.status === 'SENT') {
          return {
            success: true,
            messageId: data.messageId,
          };
        }
      }
    } catch (error) {
      console.warn('[MetaWhatsAppCloudProvider] Error enviando plantilla, aplicando fallback:', error);
    }

    return this.fallbackProvider.sendTemplateMessage(formattedPhone, templateName, params);
  }

  async markAsRead(externalMessageId: string): Promise<void> {
    try {
      await fetch('/api/whatsapp/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: externalMessageId }),
      });
    } catch (err) {
      console.warn('[MetaWhatsAppCloudProvider] No se pudo marcar como leído:', err);
    }
  }
}
