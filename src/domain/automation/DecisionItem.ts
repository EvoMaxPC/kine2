/**
 * @file DecisionItem.ts
 * @description Entidad del Centro de Decisiones (Decision Center) de KineTurnos.
 */

export type DecisionType =
  | 'EXCEPTION_REQUEST'
  | 'NO_COMPATIBLE_SLOTS'
  | 'PATIENT_CONFLICT'
  | 'OVERBOOKING_REQUEST'
  | 'AMBIGUOUS_MESSAGE'
  | 'WAITLIST_OFFER_APPROVAL'
  | 'UNRECOGNIZED_INTENT'
  | 'HIGH_DELAY_ALERT';

export type DecisionPriority = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'LOW';
export type DecisionSeverity = 'urgent' | 'warning' | 'info';

export type DecisionStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED' | 'ACCEPTED' | 'REJECTED';

export interface DecisionProposedAction {
  id: string;
  type: string;
  title: string;
  label?: string;
  description: string;
  details?: string;
  isPrimary?: boolean;
  payload?: any;
}

export interface DecisionItem {
  id: string;
  type: DecisionType;
  priority: DecisionPriority;
  severity?: DecisionSeverity;
  status: DecisionStatus;
  title: string;
  whatHappened: string; // Qué ocurrió
  description?: string; // Sinónimo / compatibilidad
  systemProposal: string; // Qué propone el sistema
  proposedAction?: {
    type: string;
    label: string;
    details: string;
    payload?: any;
  };
  recommendedActions: DecisionProposedAction[]; // Acciones recomendadas
  alternatives?: Array<{
    id: string;
    label: string;
    description?: string;
    payload?: any;
  }>;
  source?: string;
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  appointmentId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  createdAt: string; // ISO
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNote?: string;
  resolutionNotes?: string;
}
