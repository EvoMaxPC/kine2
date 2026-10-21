/**
 * @file ClinicDelayState.ts
 * @description Estado de demora del consultorio e información de pacientes afectados.
 */

export interface AffectedAppointmentPreview {
  appointmentId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  originalTime: string; // HH:mm
  newEstimatedTime: string; // HH:mm
  messagePreview: string;
  notified: boolean;
  notifiedAt?: string;
}

export interface ClinicDelayState {
  id: string;
  professionalId: string;
  delayMinutes: number;
  reason?: string;
  setAt: string; // ISO 8601
  active: boolean;
  affectedAppointments: AffectedAppointmentPreview[];
}
