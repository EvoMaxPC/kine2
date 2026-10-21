import { Appointment, AppointmentStatus, ScheduleBlock } from '../types/index.ts';

export interface IAppointmentRepository {
  getTodayAppointments(professionalId?: string): Promise<Appointment[]>;
  getAppointmentsByDateRange(
    startDateIso: string,
    endDateIso: string,
    professionalId?: string
  ): Promise<Appointment[]>;
  getAppointmentById(id: string): Promise<Appointment | null>;
  getPatientActiveAppointments(patientId: string): Promise<Appointment[]>;
  checkAvailability(
    professionalId: string,
    startAt: string,
    endAt: string,
    excludeAppointmentId?: string,
    bufferMinutes?: number
  ): Promise<boolean>;
  createAppointment(
    data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Appointment>;
  updateAppointmentStatus(
    id: string,
    status: AppointmentStatus,
    reason?: string
  ): Promise<Appointment>;
  updateAppointment(
    id: string,
    updates: Partial<Appointment>
  ): Promise<Appointment>;
  rescheduleAppointment(
    id: string,
    newStartAt: string,
    newEndAt: string
  ): Promise<Appointment>;
  cancelAppointment(id: string, reason?: string): Promise<Appointment>;
  acquireSlotLock(professionalId: string, startAt: string): Promise<boolean>;
  releaseSlotLock(professionalId: string, startAt: string): Promise<void>;

  // Schedule blocks (bloqueos de horario)
  getScheduleBlocks(
    startDateIso?: string,
    endDateIso?: string,
    professionalId?: string
  ): Promise<ScheduleBlock[]>;
  createScheduleBlock(
    data: Omit<ScheduleBlock, 'id' | 'createdAt'>
  ): Promise<ScheduleBlock>;
  removeScheduleBlock(id: string): Promise<void>;
}
