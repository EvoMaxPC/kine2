import { Patient } from '../types/index.ts';

export interface IPatientRepository {
  getAllPatients(): Promise<Patient[]>;
  getPatientById(id: string): Promise<Patient | null>;
  getPatientByPhone(phone: string): Promise<Patient | null>;
  findPatientByPhone?(phone: string): Promise<Patient | null>;
  searchPatients(query: string): Promise<Patient[]>;
  createPatient(data: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient>;
  updatePatient(id: string, updates: Partial<Patient>): Promise<Patient>;
}
