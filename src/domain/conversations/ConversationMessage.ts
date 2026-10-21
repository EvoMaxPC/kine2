export type MessageDirection = 'INBOUND' | 'OUTBOUND';
export type MessageType = 'TEXT' | 'AUDIO';
export type MessageDeliveryStatus =
  | 'RECEIVED'
  | 'VERIFIED'
  | 'PROCESSING'
  | 'AWAITING_PROFESSIONAL'
  | 'APPROVED'
  | 'SENT'
  | 'DELIVERED'
  | 'READ'
  | 'FAILED'
  | 'PREPARED_FOR_WHATSAPP';

export interface ConversationMessage {
  id: string;
  patientId: string;
  direction: MessageDirection;
  messageType: MessageType;
  content: string;
  transcription?: string;
  timestamp: string;
  externalMessageId?: string;
  status: MessageDeliveryStatus;
}
