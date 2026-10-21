import { IAuditRepository } from './IAuditRepository.ts';
import { AuditEvent } from '../types/index.ts';
import { DEMO_INITIAL_AUDIT } from '../mock/demoData.ts';

export class MockAuditRepository implements IAuditRepository {
  private events: AuditEvent[] = [];

  constructor(initialData?: AuditEvent[]) {
    this.events = JSON.parse(
      JSON.stringify(initialData || DEMO_INITIAL_AUDIT)
    );
  }

  async recordEvent(
    data: Omit<AuditEvent, 'id' | 'timestamp'>
  ): Promise<AuditEvent> {
    const newEvent: AuditEvent = {
      ...data,
      id: `aud_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.events.unshift(newEvent);
    if (this.events.length > 500) {
      this.events = this.events.slice(0, 500);
    }
    return { ...newEvent };
  }

  async getEvents(limit: number = 100): Promise<AuditEvent[]> {
    return this.events.slice(0, limit);
  }

  async getRecentEvents(limit: number = 100): Promise<AuditEvent[]> {
    return this.events.slice(0, limit);
  }

  async getEventsByEntity(entityType: string, entityId: string): Promise<AuditEvent[]> {
    return this.events.filter(
      (e) => e.entityType === entityType && e.entityId === entityId
    );
  }
}
