import { MessageDeliveryStatus } from '../../domain/conversations/ConversationMessage.ts';

export interface IWhatsAppProvider {
  /**
   * Prepares or dispatches an outbound text message to the patient's WhatsApp.
   */
  sendTextMessage(
    toPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId: string; status: MessageDeliveryStatus; whatsappUrl?: string }>;

  sendMessage(
    toPhone: string,
    text: string
  ): Promise<{ success: boolean; messageId: string; status: MessageDeliveryStatus; whatsappUrl?: string }>;

  sendTemplateMessage(
    toPhone: string,
    templateName: string,
    params: Record<string, string>
  ): Promise<{ success: boolean; messageId: string; whatsappUrl?: string }>;

  markAsRead(externalMessageId: string): Promise<void>;
}
