export type ActorType = 'STAFF' | 'SYSTEM_RULE' | 'AI_ASSISTANT' | 'PATIENT_ACTION';
export type AuditEntityType = 'APPOINTMENT' | 'REQUEST' | 'PATIENT' | 'SLOT' | 'CONFIG';

export interface AuditEvent {
  id: string;
  timestamp: string; // ISO 8601
  actorType: ActorType;
  actorId?: string;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  description: string;
}
