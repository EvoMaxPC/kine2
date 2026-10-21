import { IAuditRepository } from '../IAuditRepository.ts';
import { AuditEvent } from '../../types/index.ts';
import { persistentStorageManager } from './PersistentStorageManager.ts';

export class PersistentAuditRepository implements IAuditRepository {
  async recordEvent(data: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    const newEvent: AuditEvent = {
      ...data,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    persistentStorageManager.mutate((st) => {
      st.auditLogs.unshift(newEvent);
      // Mantener un límite razonable en almacenamiento local (ej: últimos 500 eventos)
      if (st.auditLogs.length > 500) {
        st.auditLogs = st.auditLogs.slice(0, 500);
      }
    });

    return { ...newEvent };
  }

  async logEvent(data: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<AuditEvent> {
    return this.recordEvent(data);
  }

  async getEvents(limit: number = 50): Promise<AuditEvent[]> {
    const state = persistentStorageManager.getState();
    return state.auditLogs.slice(0, limit);
  }

  async getRecentEvents(limit: number = 50): Promise<AuditEvent[]> {
    return this.getEvents(limit);
  }

  async getEventsByEntity(entityType: string, entityId: string): Promise<AuditEvent[]> {
    const state = persistentStorageManager.getState();
    return state.auditLogs.filter(
      (e) => e.entityType === entityType && e.entityId === entityId
    );
  }
}
