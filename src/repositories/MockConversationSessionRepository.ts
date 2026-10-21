import { IConversationSessionRepository } from './IConversationSessionRepository.ts';
import { ConversationSession } from '../types/index.ts';

export class MockConversationSessionRepository implements IConversationSessionRepository {
  private sessions = new Map<string, ConversationSession>();

  async getSessionByPhone(phone: string): Promise<ConversationSession | null> {
    const session = this.sessions.get(phone);
    if (!session) return null;

    // Check expiration
    const now = new Date().getTime();
    const expiresAt = new Date(session.expiresAt).getTime();
    if (now > expiresAt) {
      this.sessions.delete(phone);
      return null;
    }

    return { ...session };
  }

  async saveSession(session: ConversationSession): Promise<ConversationSession> {
    this.sessions.set(session.phoneNumber, {
      ...session,
      updatedAt: new Date().toISOString(),
    });
    return { ...session };
  }

  async clearSession(phone: string): Promise<void> {
    this.sessions.delete(phone);
  }

  async getAllActiveSessions(): Promise<ConversationSession[]> {
    const now = new Date().getTime();
    const active: ConversationSession[] = [];
    for (const [phone, session] of this.sessions.entries()) {
      if (now <= new Date(session.expiresAt).getTime()) {
        active.push({ ...session });
      } else {
        this.sessions.delete(phone);
      }
    }
    return active;
  }
}
