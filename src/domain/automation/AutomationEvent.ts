import { AutomationEventType } from './AutomationEventType.ts';

export interface BaseAutomationEvent<T = Record<string, unknown>> {
  id: string;
  type: AutomationEventType;
  timestamp: string; // ISO 8601
  source: 'SYSTEM' | 'WHATSAPP' | 'PROFESSIONAL' | 'CRON_TIMER';
  payload: T;
}

export interface PatientMessageReceivedPayload {
  phoneNumber: string;
  patientId?: string;
  patientName?: string;
  messageText: string;
  isAudio?: boolean;
  transcription?: string;
  externalMessageId?: string;
}

export interface AppointmentLifecyclePayload {
  appointmentId: string;
  patientId: string;
  patientName?: string;
  professionalId: string;
  startIso: string;
  endIso: string;
  previousStatus?: string;
  newStatus?: string;
  reason?: string;
}

export interface SlotReleasedPayload {
  date: string;
  time: string;
  startIso: string;
  endIso: string;
  professionalId: string;
  releasedByAppointmentId?: string;
  reason?: string;
}

export interface WaitlistMatchFoundPayload {
  waitlistEntryId: string;
  patientId: string;
  patientName: string;
  slotStartIso: string;
  slotEndIso: string;
  professionalId: string;
  matchScore?: number;
}

export interface SlotOfferExpiredPayload {
  offerId: string;
  waitlistEntryId: string;
  patientId: string;
  slotStartIso: string;
  slotEndIso: string;
  professionalId: string;
}

export interface PatientConfirmationReceivedPayload {
  appointmentId: string;
  patientId: string;
  confirmed: boolean;
  rawResponse: string;
}

export interface ClinicDelayChangedPayload {
  professionalId: string;
  delayMinutes: number;
  message?: string;
  affectedAppointmentIds: string[];
}

export type AutomationEvent =
  | (BaseAutomationEvent<PatientMessageReceivedPayload> & { type: AutomationEventType.PATIENT_MESSAGE_RECEIVED })
  | (BaseAutomationEvent<AppointmentLifecyclePayload> & { type: AutomationEventType.APPOINTMENT_CREATED })
  | (BaseAutomationEvent<AppointmentLifecyclePayload> & { type: AutomationEventType.APPOINTMENT_CONFIRMED })
  | (BaseAutomationEvent<AppointmentLifecyclePayload> & { type: AutomationEventType.APPOINTMENT_CANCELLED })
  | (BaseAutomationEvent<AppointmentLifecyclePayload> & { type: AutomationEventType.APPOINTMENT_RESCHEDULED })
  | (BaseAutomationEvent<SlotReleasedPayload> & { type: AutomationEventType.SLOT_RELEASED })
  | (BaseAutomationEvent<AppointmentLifecyclePayload> & { type: AutomationEventType.PATIENT_ARRIVED })
  | (BaseAutomationEvent<AppointmentLifecyclePayload> & { type: AutomationEventType.APPOINTMENT_STARTING_SOON })
  | (BaseAutomationEvent<AppointmentLifecyclePayload> & { type: AutomationEventType.APPOINTMENT_OVERDUE })
  | (BaseAutomationEvent<WaitlistMatchFoundPayload> & { type: AutomationEventType.WAITLIST_MATCH_FOUND })
  | (BaseAutomationEvent<AppointmentLifecyclePayload> & { type: AutomationEventType.REMINDER_DUE })
  | (BaseAutomationEvent<PatientConfirmationReceivedPayload> & { type: AutomationEventType.PATIENT_CONFIRMATION_RECEIVED })
  | (BaseAutomationEvent<Record<string, unknown>> & { type: AutomationEventType.NO_RESPONSE_TIMEOUT })
  | (BaseAutomationEvent<SlotOfferExpiredPayload> & { type: AutomationEventType.SLOT_OFFER_EXPIRED })
  | (BaseAutomationEvent<ClinicDelayChangedPayload> & { type: AutomationEventType.CLINIC_DELAY_CHANGED });
