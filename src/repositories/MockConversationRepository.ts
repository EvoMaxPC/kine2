import { IConversationRepository } from './IConversationRepository.ts';
import {
  ConversationMessage,
  ConversationSession,
  PatientDelayNotice,
  ClinicDelayState,
} from '../types/index.ts';
import { DEMO_INITIAL_MESSAGES } from '../mock/demoData.ts';

export class MockConversationRepository implements IConversationRepository {
  private messages: ConversationMessage[] = [];
  private sessions: Record<string, ConversationSession> = {};
  private delayNotices: PatientDelayNotice[] = [];
  private clinicDelay: ClinicDelayState | null = null;

  constructor(initialData?: ConversationMessage[]) {
    this.messages = JSON.parse(
      JSON.stringify(initialData || DEMO_INITIAL_MESSAGES)
    );
  }

  async getMessagesByPatientId(patientId: string): Promise<ConversationMessage[]> {
    return this.messages
      .filter((m) => m.patientId === patientId)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async getMessagesByPhone(phone: string): Promise<ConversationMessage[]> {
    return this.messages
      .filter((m) => m.patientId === phone)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async recordMessage(
    data: Omit<ConversationMessage, 'id' | 'timestamp'>
  ): Promise<ConversationMessage> {
    const newMsg: ConversationMessage = {
      ...data,
      id: `msg_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.messages.push(newMsg);
    return { ...newMsg };
  }

  async getSession(sessionId: string): Promise<ConversationSession | null> {
    const session = this.sessions[sessionId];
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      delete this.sessions[sessionId];
      return null;
    }
    return { ...session };
  }

  async saveSession(session: ConversationSession): Promise<void> {
    this.sessions[session.sessionId] = {
      ...session,
      updatedAt: new Date().toISOString(),
    };
  }

  async clearSession(sessionId: string): Promise<void> {
    delete this.sessions[sessionId];
  }

  async getPatientDelayNotices(appointmentId?: string): Promise<PatientDelayNotice[]> {
    if (appointmentId) {
      return this.delayNotices.filter((n) => n.appointmentId === appointmentId);
    }
    return [...this.delayNotices];
  }

  async recordPatientDelayNotice(
    notice: Omit<PatientDelayNotice, 'id' | 'reportedAt'>
  ): Promise<PatientDelayNotice> {
    const newNotice: PatientDelayNotice = {
      ...notice,
      id: `delay_mock_${Date.now()}`,
      reportedAt: new Date().toISOString(),
    };
    this.delayNotices.push(newNotice);
    return newNotice;
  }

  async getClinicDelayState(): Promise<ClinicDelayState | null> {
    return this.clinicDelay ? { ...this.clinicDelay } : null;
  }

  async setClinicDelayState(state: ClinicDelayState | null): Promise<void> {
    this.clinicDelay = state ? { ...state } : null;
  }
}
