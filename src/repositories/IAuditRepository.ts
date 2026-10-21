import { AuditEvent } from '../types/index.ts';

export interface IAuditRepository {
  recordEvent(data: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent>;
  getEvents(limit?: number): Promise<AuditEvent[]>;
  getEventsByEntity(entityType: string, entityId: string): Promise<AuditEvent[]>;
  getRecentEvents(limit?: number): Promise<AuditEvent[]>;
}
