export enum PatientIntent {
  REQUEST_APPOINTMENT = 'REQUEST_APPOINTMENT',
  CHANGE_APPOINTMENT = 'CHANGE_APPOINTMENT',
  CANCEL_APPOINTMENT = 'CANCEL_APPOINTMENT',
  CHECK_APPOINTMENT = 'CHECK_APPOINTMENT',
  CHECK_AVAILABILITY = 'CHECK_AVAILABILITY',
  CONFIRM_APPOINTMENT = 'CONFIRMED_APPOINTMENT',
  ACCEPT_OFFER = 'ACCEPT_OFFER',
  DECLINE_OFFER = 'DECLINE_OFFER',
  REPORT_DELAY = 'REPORT_DELAY',
  ASK_PRICE = 'ASK_PRICE',
  ASK_DELAY = 'ASK_DELAY',
  FAQ_INQUIRY = 'FAQ_INQUIRY',
  PROVIDE_NAME = 'PROVIDE_NAME',
  GREETING = 'GREETING',
  OTHER = 'OTHER',
  AMBIGUOUS = 'AMBIGUOUS',
}

export interface StructuredAiExtraction {
  intent: PatientIntent;
  confidence: number;
  extractedDate?: string;
  timePreference?: string;
  targetAppointmentId?: string;
  requiresClarification: boolean;
  clarificationQuestion?: string;
}
