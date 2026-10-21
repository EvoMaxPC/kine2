import { IProfessionalRepository } from './IProfessionalRepository.ts';
import { Professional } from '../types/index.ts';
import { DEMO_PROFESSIONALS } from '../mock/demoData.ts';

export class MockProfessionalRepository implements IProfessionalRepository {
  private professionals: Professional[] = [];

  constructor(initialData?: Professional[]) {
    this.professionals = JSON.parse(
      JSON.stringify(initialData || DEMO_PROFESSIONALS)
    );
  }

  async getAllProfessionals(): Promise<Professional[]> {
    return [...this.professionals];
  }

  async getProfessionalById(id: string): Promise<Professional | null> {
    const prof = this.professionals.find((p) => p.id === id);
    return prof ? { ...prof } : null;
  }

  async createProfessional(data: Omit<Professional, 'id'>): Promise<Professional> {
    const newProf: Professional = {
      ...data,
      id: `prof_${Date.now()}`,
    };
    this.professionals.push(newProf);
    return { ...newProf };
  }

  async updateProfessional(id: string, updates: Partial<Professional>): Promise<Professional> {
    const idx = this.professionals.findIndex((p) => p.id === id);
    if (idx === -1) throw new Error(`Profesional no encontrado: ${id}`);
    this.professionals[idx] = { ...this.professionals[idx], ...updates };
    return { ...this.professionals[idx] };
  }
}
