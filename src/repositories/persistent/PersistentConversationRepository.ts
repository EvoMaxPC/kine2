import { IConversationRepository } from '../IConversationRepository.ts';
import {
  ConversationMessage,
  ConversationSession,
  PatientDelayNotice,
  ClinicDelayState,
} from '../../types/index.ts';
import { persistentStorageManager } from './PersistentStorageManager.ts';

export class PersistentConversationRepository implements IConversationRepository {
  async getMessagesByPatientId(patientId: string): Promise<ConversationMessage[]> {
    const state = persistentStorageManager.getState();
    const list = state.conversations[patientId] || [];
    return [...list].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async getMessages(patientId: string): Promise<ConversationMessage[]> {
    return this.getMessagesByPatientId(patientId);
  }

  async getMessagesByPhone(phone: string): Promise<ConversationMessage[]> {
    const state = persistentStorageManager.getState();
    // Look up patient with that phone or check in conversation sessions
    const patient = state.patients.find(
      (p) => p.whatsappPhone === phone || p.phone === phone
    );
    if (patient) {
      return this.getMessagesByPatientId(patient.id);
    }
    // Also check direct phone key if messages recorded with phone
    const list = state.conversations[phone] || [];
    return [...list].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  async recordMessage(
    message: Omit<ConversationMessage, 'id' | 'timestamp'>
  ): Promise<ConversationMessage> {
    const newMsg: ConversationMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    persistentStorageManager.mutate((st) => {
      const key = message.patientId;
      if (!st.conversations[key]) {
        st.conversations[key] = [];
      }
      st.conversations[key].push(newMsg);
    });

    return { ...newMsg };
  }

  async addMessage(
    message: Omit<ConversationMessage, 'id' | 'timestamp'>
  ): Promise<ConversationMessage> {
    return this.recordMessage(message);
  }

  // Conversation session memory
  async getSession(sessionId: string): Promise<ConversationSession | null> {
    const state = persistentStorageManager.getState();
    const session = state.conversationSessions[sessionId];
    if (!session) return null;

    // Check expiration
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await this.clearSession(sessionId);
      return null;
    }

    return { ...session };
  }

  async saveSession(session: ConversationSession): Promise<void> {
    persistentStorageManager.mutate((st) => {
      if (!st.conversationSessions) st.conversationSessions = {};
      st.conversationSessions[session.sessionId] = {
        ...session,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  async clearSession(sessionId: string): Promise<void> {
    persistentStorageManager.mutate((st) => {
      if (st.conversationSessions && st.conversationSessions[sessionId]) {
        delete st.conversationSessions[sessionId];
      }
    });
  }

  // Patient delay notices
  async getPatientDelayNotices(appointmentId?: string): Promise<PatientDelayNotice[]> {
    const state = persistentStorageManager.getState();
    const notices = state.patientDelayNotices || [];
    if (appointmentId) {
      return notices.filter((n) => n.appointmentId === appointmentId);
    }
    return [...notices];
  }

  async recordPatientDelayNotice(
    notice: Omit<PatientDelayNotice, 'id' | 'reportedAt'>
  ): Promise<PatientDelayNotice> {
    const newNotice: PatientDelayNotice = {
      ...notice,
      id: `delay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      reportedAt: new Date().toISOString(),
    };

    persistentStorageManager.mutate((st) => {
      if (!st.patientDelayNotices) st.patientDelayNotices = [];
      st.patientDelayNotices.push(newNotice);
    });

    return newNotice;
  }

  // Clinic delay state
  async getClinicDelayState(): Promise<ClinicDelayState | null> {
    const state = persistentStorageManager.getState();
    return state.clinicDelay ? { ...state.clinicDelay } : null;
  }

  async setClinicDelayState(clinicDelay: ClinicDelayState | null): Promise<void> {
    persistentStorageManager.mutate((st) => {
      st.clinicDelay = clinicDelay ? { ...clinicDelay } : null;
    });
  }
}
