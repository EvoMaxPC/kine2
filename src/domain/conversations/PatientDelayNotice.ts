/**
 * @file PatientDelayNotice.ts
 * @description Registro cuando un paciente avisa que llegará con demora a su turno.
 */

export interface PatientDelayNotice {
  id: string;
  patientId: string;
  patientName: string;
  appointmentId: string;
  delayMinutes: number;
  originalStartAt: string;
  reportedAt: string; // ISO 8601
  acknowledged: boolean;
  notes?: string;
}
