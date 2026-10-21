import { IProfessionalRepository } from '../IProfessionalRepository.ts';
import { Professional } from '../../types/index.ts';
import { persistentStorageManager } from './PersistentStorageManager.ts';

export class PersistentProfessionalRepository implements IProfessionalRepository {
  async getAllProfessionals(): Promise<Professional[]> {
    const state = persistentStorageManager.getState();
    return [...state.professionals];
  }

  async getProfessionalById(id: string): Promise<Professional | null> {
    const state = persistentStorageManager.getState();
    const found = state.professionals.find((p) => p.id === id);
    return found ? { ...found } : null;
  }

  async createProfessional(data: Omit<Professional, 'id'>): Promise<Professional> {
    const newProf: Professional = {
      ...data,
      id: `prof_${Date.now()}`,
    };

    persistentStorageManager.mutate((st) => {
      st.professionals.push(newProf);
    });

    return { ...newProf };
  }

  async updateProfessional(id: string, updates: Partial<Professional>): Promise<Professional> {
    let updated: Professional | null = null;
    persistentStorageManager.mutate((st) => {
      const idx = st.professionals.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error(`Profesional no encontrado: ${id}`);
      st.professionals[idx] = { ...st.professionals[idx], ...updates };
      updated = { ...st.professionals[idx] };
    });

    return updated!;
  }
}
