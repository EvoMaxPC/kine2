/**
 * @file ConversationSession.ts
 * @description Memoria operativa de conversación administrativa para la Secretaria Digital.
 */

export type ConversationStep =
  | 'IDLE'
  | 'AWAITING_NAME'
  | 'AWAITING_PATIENT_NAME'
  | 'OFFERING_SLOTS'
  | 'AWAITING_RESCHEDULE_CHOICE'
  | 'CONFIRMING_CANCELLATION'
  | 'AWAITING_REMINDER_RESPONSE'
  | 'AWAITING_OFFER_RESPONSE'
  | 'WAITLIST_OFFER_PENDING'
  | 'AWAITING_RESCHEDULE_CONFIRMATION'
  | 'AWAITING_CHANGE_CONFIRMATION';

export interface CandidateSlot {
  index?: number; // 1, 2, 3
  slotId?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  startIso: string;
  endIso: string;
  professionalId: string;
  professionalName?: string;
  human?: string;
  humanLabel?: string;
}

export type CandidateSlotOption = CandidateSlot;

export interface ConversationSession {
  sessionId: string; // e.g. sess_phone
  phoneNumber: string;
  patientId?: string;
  contactName?: string;
  isUnknownContact: boolean;
  temporaryName?: string;
  intent?: string;
  activeIntent?: string;
  step: ConversationStep | string;
  selectedAppointmentId?: string;
  rescheduleTargetAppId?: string;
  pendingOfferId?: string;
  pendingAppointmentId?: string;
  pendingAction?: string;
  candidateSlots?: CandidateSlot[];
  lastQuestion?: string;
  pendingConfirmation?: {
    action: string;
    payload: any;
    expiresAt?: string;
  };
  expiresAt: string; // ISO 8601
  createdAt: string;
  updatedAt: string;
}
