import { IAppointmentRepository } from '../IAppointmentRepository.ts';
import { Appointment, AppointmentStatus, ScheduleBlock } from '../../types/index.ts';
import { persistentStorageManager } from './PersistentStorageManager.ts';
import { doIntervalsOverlap, getTodayDateString } from '../../utils/dateUtils.ts';

export class PersistentAppointmentRepository implements IAppointmentRepository {
  private slotLocks = new Set<string>();

  private getLockKey(professionalId: string, startAt: string): string {
    return `${professionalId}_${startAt}`;
  }

  async getTodayAppointments(professionalId?: string): Promise<Appointment[]> {
    const today = getTodayDateString();
    const state = persistentStorageManager.getState();
    const list = Array.isArray(state.appointments) ? state.appointments : [];
    return list
      .filter((a) => {
        if (!a || !a.startAt || typeof a.startAt !== 'string') return false;
        if (!a.startAt.startsWith(today)) return false;
        if (professionalId && a.professionalId !== professionalId) return false;
        return a.status !== AppointmentStatus.CANCELLED;
      })
      .sort((a, b) => (a.startAt || '').localeCompare(b.startAt || ''));
  }

  async getAppointmentsByDateRange(
    startDateIso: string,
    endDateIso: string,
    professionalId?: string
  ): Promise<Appointment[]> {
    const state = persistentStorageManager.getState();
    const list = Array.isArray(state.appointments) ? state.appointments : [];
    return list
      .filter((a) => {
        if (!a || !a.startAt || typeof a.startAt !== 'string') return false;
        if (a.startAt < startDateIso || a.startAt > endDateIso) return false;
        if (professionalId && a.professionalId !== professionalId) return false;
        return a.status !== AppointmentStatus.CANCELLED;
      })
      .sort((a, b) => (a.startAt || '').localeCompare(b.startAt || ''));
  }

  async getAppointmentById(id: string): Promise<Appointment | null> {
    const state = persistentStorageManager.getState();
    const list = Array.isArray(state.appointments) ? state.appointments : [];
    const found = list.find((a) => a && a.id === id);
    return found ? { ...found } : null;
  }

  async getPatientActiveAppointments(patientId: string): Promise<Appointment[]> {
    const today = getTodayDateString();
    const state = persistentStorageManager.getState();
    const list = Array.isArray(state.appointments) ? state.appointments : [];
    return list
      .filter((a) => {
        if (!a || a.patientId !== patientId) return false;
        if (!a.startAt || a.startAt < today) return false;
        return (
          a.status === AppointmentStatus.CONFIRMED ||
          a.status === AppointmentStatus.PENDING_APPROVAL ||
          a.status === AppointmentStatus.CHANGE_PENDING
        );
      })
      .sort((a, b) => (a.startAt || '').localeCompare(b.startAt || ''));
  }

  async checkAvailability(
    professionalId: string,
    startAt: string,
    endAt: string,
    excludeAppointmentId?: string,
    bufferMinutes: number = 0
  ): Promise<boolean> {
    const state = persistentStorageManager.getState();
    const appointments = Array.isArray(state.appointments) ? state.appointments : [];
    const scheduleBlocks = Array.isArray(state.scheduleBlocks) ? state.scheduleBlocks : [];

    // 1. Chequear colisiones con turnos existentes del profesional
    for (const app of appointments) {
      if (!app || !app.startAt || !app.endAt) continue;
      if (excludeAppointmentId && app.id === excludeAppointmentId) continue;
      if (app.professionalId !== professionalId) continue;
      if (
        app.status === AppointmentStatus.CANCELLED ||
        app.status === AppointmentStatus.NO_SHOW ||
        app.status === AppointmentStatus.COMPLETED
      ) {
        continue;
      }

      const appEndIso =
        bufferMinutes > 0
          ? new Date(new Date(app.endAt).getTime() + bufferMinutes * 60000).toISOString()
          : app.endAt;

      if (doIntervalsOverlap(startAt, endAt, app.startAt, appEndIso)) {
        return false;
      }
    }

    // 2. Chequear bloqueos de agenda
    for (const block of scheduleBlocks) {
      if (!block || !block.startAt || !block.endAt) continue;
      if (block.professionalId && block.professionalId !== professionalId) continue;
      if (doIntervalsOverlap(startAt, endAt, block.startAt, block.endAt)) {
        return false;
      }
    }

    return true;
  }

  async createAppointment(
    data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Appointment> {
    const isAvail = await this.checkAvailability(
      data.professionalId,
      data.startAt,
      data.endAt
    );

    if (!isAvail) {
      throw new Error(
        `El profesional no tiene disponibilidad para el horario seleccionado (${data.startAt})`
      );
    }

    const now = new Date().toISOString();
    const newAppointment: Appointment = {
      ...data,
      id: `apt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: now,
      updatedAt: now,
    };

    persistentStorageManager.mutate((st) => {
      if (!Array.isArray(st.appointments)) st.appointments = [];
      st.appointments.push(newAppointment);
    });

    return { ...newAppointment };
  }

  async updateAppointmentStatus(
    id: string,
    status: AppointmentStatus,
    _reason?: string
  ): Promise<Appointment> {
    let updated: Appointment | null = null;
    persistentStorageManager.mutate((st) => {
      if (!Array.isArray(st.appointments)) st.appointments = [];
      const idx = st.appointments.findIndex((a) => a && a.id === id);
      if (idx === -1) {
        throw new Error(`Turno no encontrado: ${id}`);
      }
      st.appointments[idx] = {
        ...st.appointments[idx],
        status,
        updatedAt: new Date().toISOString(),
      };
      updated = { ...st.appointments[idx] };
    });

    return updated!;
  }

  async updateAppointment(
    id: string,
    updates: Partial<Appointment>
  ): Promise<Appointment> {
    let updated: Appointment | null = null;
    persistentStorageManager.mutate((st) => {
      if (!Array.isArray(st.appointments)) st.appointments = [];
      const idx = st.appointments.findIndex((a) => a && a.id === id);
      if (idx === -1) {
        throw new Error(`Turno no encontrado: ${id}`);
      }
      st.appointments[idx] = {
        ...st.appointments[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      updated = { ...st.appointments[idx] };
    });

    return updated!;
  }

  async rescheduleAppointment(
    id: string,
    newStartAt: string,
    newEndAt: string
  ): Promise<Appointment> {
    const current = await this.getAppointmentById(id);
    if (!current) {
      throw new Error(`Turno no encontrado: ${id}`);
    }

    const isAvailable = await this.checkAvailability(
      current.professionalId,
      newStartAt,
      newEndAt,
      id
    );

    if (!isAvailable) {
      throw new Error(
        `El nuevo horario seleccionado no está disponible (${newStartAt})`
      );
    }

    let updated: Appointment | null = null;
    persistentStorageManager.mutate((st) => {
      if (!Array.isArray(st.appointments)) st.appointments = [];
      const idx = st.appointments.findIndex((a) => a && a.id === id);
      if (idx !== -1) {
        st.appointments[idx] = {
          ...st.appointments[idx],
          startAt: newStartAt,
          endAt: newEndAt,
          status: AppointmentStatus.CONFIRMED,
          updatedAt: new Date().toISOString(),
        };
        updated = { ...st.appointments[idx] };
      }
    });

    return updated!;
  }

  async cancelAppointment(id: string, _reason?: string): Promise<Appointment> {
    return this.updateAppointmentStatus(id, AppointmentStatus.CANCELLED, _reason);
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

  async getScheduleBlocks(
    startDateIso?: string,
    endDateIso?: string,
    professionalId?: string
  ): Promise<ScheduleBlock[]> {
    const state = persistentStorageManager.getState();
    const blocks = Array.isArray(state.scheduleBlocks) ? state.scheduleBlocks : [];
    return blocks.filter((b) => {
      if (!b || !b.startAt || !b.endAt) return false;
      if (professionalId && b.professionalId !== professionalId) return false;
      if (startDateIso && b.endAt < startDateIso) return false;
      if (endDateIso && b.startAt > endDateIso) return false;
      return true;
    });
  }

  async createScheduleBlock(
    data: Omit<ScheduleBlock, 'id' | 'createdAt'>
  ): Promise<ScheduleBlock> {
    const state = persistentStorageManager.getState();
    const blocks = Array.isArray(state.scheduleBlocks) ? state.scheduleBlocks : [];
    const exists = blocks.some(
      (b) =>
        b &&
        b.professionalId === data.professionalId &&
        b.startAt === data.startAt &&
        b.endAt === data.endAt
    );
    if (exists) {
      throw new Error('Ya existe un bloqueo registrado para ese horario exacto.');
    }

    const newBlock: ScheduleBlock = {
      ...data,
      id: `blk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    persistentStorageManager.mutate((st) => {
      if (!Array.isArray(st.scheduleBlocks)) st.scheduleBlocks = [];
      st.scheduleBlocks.push(newBlock);
    });

    return { ...newBlock };
  }

  async removeScheduleBlock(id: string): Promise<void> {
    persistentStorageManager.mutate((st) => {
      if (Array.isArray(st.scheduleBlocks)) {
        st.scheduleBlocks = st.scheduleBlocks.filter((b) => b && b.id !== id);
      }
    });
  }
}
