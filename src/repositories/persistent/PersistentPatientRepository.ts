import { IPatientRepository } from '../IPatientRepository.ts';
import { Patient } from '../../types/index.ts';
import { persistentStorageManager } from './PersistentStorageManager.ts';
import { getComparablePhoneDigits } from '../../utils/phoneUtils.ts';

export class PersistentPatientRepository implements IPatientRepository {
  async getAllPatients(): Promise<Patient[]> {
    const state = persistentStorageManager.getState();
    const list = Array.isArray(state.patients) ? state.patients : [];
    return [...list].sort((a, b) =>
      (a?.lastName || '').localeCompare(b?.lastName || '')
    );
  }

  async getPatientById(id: string): Promise<Patient | null> {
    const state = persistentStorageManager.getState();
    const list = Array.isArray(state.patients) ? state.patients : [];
    const found = list.find((p) => p && p.id === id);
    return found ? { ...found } : null;
  }

  async getPatientByPhone(phone: string): Promise<Patient | null> {
    const digits = getComparablePhoneDigits(phone);
    if (!digits) return null;
    const state = persistentStorageManager.getState();
    const list = Array.isArray(state.patients) ? state.patients : [];

    const found = list.find((p) => {
      if (!p) return false;
      const pDig = getComparablePhoneDigits(p.phone || '');
      const wDig = getComparablePhoneDigits(p.whatsappPhone || '');
      return (pDig && pDig === digits) || (wDig && wDig === digits);
    });

    return found ? { ...found } : null;
  }

  async findPatientByPhone(phone: string): Promise<Patient | null> {
    return this.getPatientByPhone(phone);
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const q = (query || '').trim().toLowerCase();
    if (!q) return this.getAllPatients();

    const state = persistentStorageManager.getState();
    const list = Array.isArray(state.patients) ? state.patients : [];
    return list.filter((p) => {
      if (!p) return false;
      const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
      const phone = (p.phone || '').toLowerCase();
      const wa = (p.whatsappPhone || '').toLowerCase();
      const ins = (p.insurance || '').toLowerCase();
      return (
        fullName.includes(q) ||
        phone.includes(q) ||
        wa.includes(q) ||
        ins.includes(q)
      );
    });
  }

  async createPatient(data: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient> {
    const newPatient: Patient = {
      ...data,
      id: `pat_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      createdAt: new Date().toISOString(),
    };

    persistentStorageManager.mutate((st) => {
      if (!Array.isArray(st.patients)) st.patients = [];
      st.patients.push(newPatient);
    });

    return { ...newPatient };
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    let updated: Patient | null = null;
    persistentStorageManager.mutate((st) => {
      if (!Array.isArray(st.patients)) st.patients = [];
      const idx = st.patients.findIndex((p) => p && p.id === id);
      if (idx === -1) {
        throw new Error(`Paciente no encontrado: ${id}`);
      }
      st.patients[idx] = { ...st.patients[idx], ...updates };
      updated = { ...st.patients[idx] };
    });

    return updated!;
  }
}
