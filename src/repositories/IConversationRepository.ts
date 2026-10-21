import {
  ConversationMessage,
  ConversationSession,
  PatientDelayNotice,
  ClinicDelayState,
} from '../types/index.ts';

export interface IConversationRepository {
  getMessagesByPatientId(patientId: string): Promise<ConversationMessage[]>;
  getMessagesByPhone(phone: string): Promise<ConversationMessage[]>;
  recordMessage(
    data: Omit<ConversationMessage, 'id' | 'timestamp'>
  ): Promise<ConversationMessage>;
  
  // Operational conversation session memory
  getSession(sessionId: string): Promise<ConversationSession | null>;
  saveSession(session: ConversationSession): Promise<void>;
  clearSession(sessionId: string): Promise<void>;

  // Patient delay notices
  getPatientDelayNotices(appointmentId?: string): Promise<PatientDelayNotice[]>;
  recordPatientDelayNotice(
    notice: Omit<PatientDelayNotice, 'id' | 'reportedAt'>
  ): Promise<PatientDelayNotice>;

  // Clinic delay state
  getClinicDelayState(): Promise<ClinicDelayState | null>;
  setClinicDelayState(state: ClinicDelayState | null): Promise<void>;
}
