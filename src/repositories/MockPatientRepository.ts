import { IPatientRepository } from './IPatientRepository.ts';
import { Patient } from '../types/index.ts';
import { DEMO_PATIENTS } from '../mock/demoData.ts';

export class MockPatientRepository implements IPatientRepository {
  private patients: Patient[] = [];

  constructor(initialData?: Patient[]) {
    this.patients = JSON.parse(
      JSON.stringify(initialData || DEMO_PATIENTS)
    );
  }

  async getAllPatients(): Promise<Patient[]> {
    return [...this.patients];
  }

  async getPatientById(id: string): Promise<Patient | null> {
    const found = this.patients.find((p) => p.id === id);
    return found ? { ...found } : null;
  }

  async getPatientByPhone(phone: string): Promise<Patient | null> {
    const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
    const found = this.patients.find(
      (p) => (p.whatsappPhone && p.whatsappPhone.replace(/[\s\-\(\)]/g, '') === cleanPhone) ||
             (p.phone && p.phone.replace(/[\s\-\(\)]/g, '') === cleanPhone)
    );
    return found ? { ...found } : null;
  }

  async findPatientByPhone(phone: string): Promise<Patient | null> {
    return this.getPatientByPhone(phone);
  }

  async searchPatients(query: string): Promise<Patient[]> {
    const term = query.toLowerCase().trim();
    if (!term) return [...this.patients];

    return this.patients.filter((p) => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase();
      const phone = p.phone.toLowerCase();
      return fullName.includes(term) || phone.includes(term);
    });
  }

  async createPatient(data: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient> {
    const newPatient: Patient = {
      ...data,
      id: `pat_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.patients.push(newPatient);
    return { ...newPatient };
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    const idx = this.patients.findIndex((p) => p.id === id);
    if (idx === -1) {
      throw new Error(`Paciente no encontrado: ${id}`);
    }
    this.patients[idx] = { ...this.patients[idx], ...updates };
    return { ...this.patients[idx] };
  }
}
