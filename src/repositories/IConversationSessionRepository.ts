import { ConversationSession } from '../types/index.ts';

export interface IConversationSessionRepository {
  getSessionByPhone(phone: string): Promise<ConversationSession | null>;
  saveSession(session: ConversationSession): Promise<ConversationSession>;
  clearSession(phone: string): Promise<void>;
  getAllActiveSessions(): Promise<ConversationSession[]>;
}
