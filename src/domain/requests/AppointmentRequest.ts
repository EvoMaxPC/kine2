import { RequestType } from './RequestType.ts';
import { RequestStatus } from './RequestStatus.ts';

export { RequestType, RequestStatus };

export interface AppointmentRequest {
  id: string;
  type: RequestType;
  patientId: string;
  professionalId: string;
  patientName?: string;
  patientPhone?: string;
  preferredDate?: string;
  preferredTime?: string;
  suggestedStartIso?: string;
  suggestedEndIso?: string;
  currentAppointmentId?: string;
  requestedStartAt?: string; // ISO 8601
  requestedEndAt?: string; // ISO 8601
  patientMessage: string;
  status: RequestStatus;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string; // 'STAFF' | 'AUTO_POLICY'
  proposedAlternativeStartAt?: string;
  proposedAlternativeEndAt?: string;
  resolutionNote?: string;
  administrativeNotes?: string;
  originalMessage?: string;
  source?: string;
}
