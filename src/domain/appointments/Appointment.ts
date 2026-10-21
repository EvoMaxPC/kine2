import { AppointmentStatus } from './AppointmentStatus.ts';

export type AppointmentSource = 'WHATSAPP_AI' | 'MANUAL_STAFF' | 'PHONE' | 'WAITLIST';
export type ConfirmationStatus = 'PENDING' | 'CONFIRMED' | 'DECLINED';

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  appointmentTypeId?: string; // Ref to AppointmentType (Sesión estándar, Evaluación inicial)
  resourceId?: string; // Ref opcional a Resource (Box 1, Box 2)
  seriesId?: string; // Ref a AppointmentSeries si forma parte de una serie
  seriesIndex?: number; // ej. 1 de 10
  seriesTotal?: number;
  startAt: string; // ISO 8601 (e.g. 2026-09-29T09:00:00-03:00)
  endAt: string; // ISO 8601
  durationMinutes: number;
  status: AppointmentStatus;
  source: AppointmentSource;
  confirmationStatus?: ConfirmationStatus;
  
  // Sala de espera digital / Progreso operativo (administrativo, no clínico)
  arrivedAt?: string; // ISO 8601 timestamp cuando el paciente llega al consultorio
  sessionStartedAt?: string; // ISO 8601 timestamp cuando pasa a atención
  completedAt?: string; // ISO 8601 timestamp cuando concluye la sesión
  
  reminderSentAt?: string;
  previousStartAt?: string; // Horario original previo a una reprogramación
  rescheduledFromId?: string;
  administrativeNotes?: string; // Notas de recepción (ej. "Abona en efectivo", "Falta firma de orden")
  
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentSlot {
  slotId: string; // e.g. "prof_1_2026-09-29_09:00"
  professionalId: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  isAvailable: boolean;
  appointmentId?: string;
  lockExpiresAt?: string;
}
