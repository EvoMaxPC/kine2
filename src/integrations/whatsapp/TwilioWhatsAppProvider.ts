import { IWhatsAppProvider } from './IWhatsAppProvider.ts';
import { FreeWhatsAppProvider } from './FreeWhatsAppProvider.ts';
import { IConversationRepository } from '../../repositories/IConversationRepository.ts';
import { formatWhatsAppPhone } from '../../utils/whatsappUtils.ts';

/**
 * @class TwilioWhatsAppProvider
 * @description Proveedor de WhatsApp con integración server-side con la API de Twilio.
 * Utiliza credenciales TWILIO_ACCOUNT_SID y TWILIO_AUTH_TOKEN en el servidor Node.js.
 */
export class TwilioWhatsAppProvider implements IWhatsAppProvider {
  private fallbackProvider: FreeWhatsAppProvider;

  constructor(private conversationRepo?: IConversationRepository) {
    this.fallbackProvider = new FreeWhatsAppProvider(conversationRepo);
  }

  /**
   * Envía un mensaje de texto saliente utilizando el backend Express de Twilio.
   */
  async sendTextMessage(
    toPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId: string; status: 'PREPARED_FOR_WHATSAPP' | 'SENT'; whatsappUrl?: string }> {
    const formattedPhone = formatWhatsAppPhone(toPhone);

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
              console.warn('[TwilioWhatsAppProvider] No se pudo guardar en conversationRepo:', err);
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
      console.warn('[TwilioWhatsAppProvider] Error enviando mensaje por backend Express, usando fallback Click-to-Chat:', error);
    }

    // Fallback seguro a Click-to-Chat
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
    const paramStr = Object.entries(params || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
    const text = `[Plantilla Twilio ${templateName}] ${paramStr}`;
    return this.sendTextMessage(formattedPhone, text);
  }

  async markAsRead(_externalMessageId: string): Promise<void> {
    // La API de Twilio no requiere marcado explícito de lectura
  }
}
