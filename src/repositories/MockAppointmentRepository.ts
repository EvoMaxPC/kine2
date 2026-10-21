import { IAppointmentRepository } from './IAppointmentRepository.ts';
import { Appointment, AppointmentStatus, ScheduleBlock } from '../types/index.ts';
import { DEMO_INITIAL_APPOINTMENTS } from '../mock/demoData.ts';
import { doIntervalsOverlap, getTodayDateString } from '../utils/dateUtils.ts';

export class MockAppointmentRepository implements IAppointmentRepository {
  private appointments: Appointment[] = [];
  private scheduleBlocks: ScheduleBlock[] = [];
  private slotLocks = new Set<string>();

  constructor(initialData?: Appointment[], initialBlocks?: ScheduleBlock[]) {
    this.appointments = JSON.parse(
      JSON.stringify(initialData || DEMO_INITIAL_APPOINTMENTS)
    );
    this.scheduleBlocks = JSON.parse(
      JSON.stringify(initialBlocks || [])
    );
  }

  private getLockKey(professionalId: string, startAt: string): string {
    return `${professionalId}_${startAt}`;
  }

  async getTodayAppointments(professionalId?: string): Promise<Appointment[]> {
    const today = getTodayDateString();
    return this.appointments
      .filter((a) => {
        if (!a.startAt.startsWith(today)) return false;
        if (professionalId && a.professionalId !== professionalId) return false;
        return a.status !== AppointmentStatus.CANCELLED;
      })
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  async getAppointmentsByDateRange(
    startDateIso: string,
    endDateIso: string,
    professionalId?: string
  ): Promise<Appointment[]> {
    return this.appointments
      .filter((a) => {
        if (a.startAt < startDateIso || a.startAt > endDateIso) return false;
        if (professionalId && a.professionalId !== professionalId) return false;
        return a.status !== AppointmentStatus.CANCELLED;
      })
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  async getAppointmentById(id: string): Promise<Appointment | null> {
    const found = this.appointments.find((a) => a.id === id);
    return found ? { ...found } : null;
  }

  async getPatientActiveAppointments(patientId: string): Promise<Appointment[]> {
    const today = getTodayDateString();
    return this.appointments
      .filter((a) => {
        if (a.patientId !== patientId) return false;
        if (a.startAt < today) return false;
        return (
          a.status === AppointmentStatus.CONFIRMED ||
          a.status === AppointmentStatus.PENDING_APPROVAL ||
          a.status === AppointmentStatus.REQUESTED
        );
      })
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
  }

  /**
   * Validates if a proposed time slot is available for the given professional.
   * Ensures no confirmed or pending appointment overlaps with the requested interval,
   * taking into account any schedule blocks and optional buffer between appointments.
   */
  async checkAvailability(
    professionalId: string,
    startAt: string,
    endAt: string,
    excludeAppointmentId?: string,
    bufferMinutes: number = 0
  ): Promise<boolean> {
    // 1. Check conflicts against existing active appointments
    const appointmentConflicts = this.appointments.filter((a) => {
      if (a.professionalId !== professionalId) return false;
      if (excludeAppointmentId && a.id === excludeAppointmentId) return false;
      if (a.status === AppointmentStatus.CANCELLED) return false;

      if (bufferMinutes > 0) {
        // Expand existing appointment interval with buffer
        const appStart = new Date(new Date(a.startAt).getTime() - bufferMinutes * 60000).toISOString();
        const appEnd = new Date(new Date(a.endAt).getTime() + bufferMinutes * 60000).toISOString();
        return doIntervalsOverlap(startAt, endAt, appStart, appEnd);
      }

      return doIntervalsOverlap(startAt, endAt, a.startAt, a.endAt);
    });

    if (appointmentConflicts.length > 0) {
      return false;
    }

    // 2. Check conflicts against schedule blocks (horarios bloqueados)
    const blockConflicts = this.scheduleBlocks.filter((b) => {
      if (b.professionalId !== professionalId) return false;
      return doIntervalsOverlap(startAt, endAt, b.startAt, b.endAt);
    });

    if (blockConflicts.length > 0) {
      return false;
    }

    return true;
  }

  async createAppointment(
    data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Appointment> {
    // Re-validate availability at creation instant
    const isAvailable = await this.checkAvailability(
      data.professionalId,
      data.startAt,
      data.endAt
    );

    if (!isAvailable) {
      throw new Error(
        'Conflicto de horario: El turno solicitado se superpone con un turno o bloqueo existente.'
      );
    }

    const newApp: Appointment = {
      ...data,
      id: `app_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.appointments.push(newApp);
    return { ...newApp };
  }

  async updateAppointmentStatus(
    id: string,
    status: AppointmentStatus,
    _reason?: string
  ): Promise<Appointment> {
    const idx = this.appointments.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new Error(`Turno no encontrado: ${id}`);
    }

    this.appointments[idx] = {
      ...this.appointments[idx],
      status,
      updatedAt: new Date().toISOString(),
    };

    return { ...this.appointments[idx] };
  }

  async updateAppointment(
    id: string,
    updates: Partial<Appointment>
  ): Promise<Appointment> {
    const idx = this.appointments.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new Error(`Turno no encontrado: ${id}`);
    }

    this.appointments[idx] = {
      ...this.appointments[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    return { ...this.appointments[idx] };
  }

  async rescheduleAppointment(
    id: string,
    newStartAt: string,
    newEndAt: string
  ): Promise<Appointment> {
    const idx = this.appointments.findIndex((a) => a.id === id);
    if (idx === -1) {
      throw new Error(`Turno no encontrado: ${id}`);
    }

    const app = this.appointments[idx];

    // Re-validate availability on destination slot excluding this appointment
    const isAvailable = await this.checkAvailability(
      app.professionalId,
      newStartAt,
      newEndAt,
      id
    );

    if (!isAvailable) {
      throw new Error(
        'El horario solicitado ya no está disponible. No se realizó ningún cambio.'
      );
    }

    this.appointments[idx] = {
      ...app,
      startAt: newStartAt,
      endAt: newEndAt,
      status: AppointmentStatus.CONFIRMED,
      updatedAt: new Date().toISOString(),
    };

    return { ...this.appointments[idx] };
  }

  /**
   * Cancels an appointment deterministically: modifies status, never deletes record (Rule 4)
   */
  async cancelAppointment(id: string, _reason?: string): Promise<Appointment> {
    return this.updateAppointmentStatus(id, AppointmentStatus.CANCELLED);
  }

  async acquireSlotLock(professionalId: string, startAt: string): Promise<boolean> {
    const key = this.getLockKey(professionalId, startAt);
    if (this.slotLocks.has(key)) {
      return false;
    }
    this.slotLocks.add(key);
    return true;
  }

  async releaseSlotLock(professionalId: string, startAt: string): Promise<void> {
    const key = this.getLockKey(professionalId, startAt);
    this.slotLocks.delete(key);
  }

  // --------------------------------------------------------------------------
  // Schedule Blocks (Bloqueo de Horarios)
  // --------------------------------------------------------------------------

  async getScheduleBlocks(
    startDateIso?: string,
    endDateIso?: string,
    professionalId?: string
  ): Promise<ScheduleBlock[]> {
    return this.scheduleBlocks.filter((b) => {
      if (professionalId && b.professionalId !== professionalId) return false;
      if (startDateIso && b.endAt < startDateIso) return false;
      if (endDateIso && b.startAt > endDateIso) return false;
      return true;
    });
  }

  async createScheduleBlock(
    data: Omit<ScheduleBlock, 'id' | 'createdAt'>
  ): Promise<ScheduleBlock> {
    // Check if an identical block already exists (idempotency check)
    const exists = this.scheduleBlocks.some(
      (b) =>
        b.professionalId === data.professionalId &&
        b.startAt === data.startAt &&
        b.endAt === data.endAt
    );

    if (exists) {
      throw new Error('Ya existe un bloqueo registrado para este horario exacto.');
    }

    const newBlock: ScheduleBlock = {
      ...data,
      id: `block_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    this.scheduleBlocks.push(newBlock);
    return { ...newBlock };
  }

  async removeScheduleBlock(id: string): Promise<void> {
    this.scheduleBlocks = this.scheduleBlocks.filter((b) => b.id !== id);
  }
}
