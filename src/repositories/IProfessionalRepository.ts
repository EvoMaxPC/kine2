import { Professional } from '../types/index.ts';

export interface IProfessionalRepository {
  getAllProfessionals(): Promise<Professional[]>;
  getProfessionalById(id: string): Promise<Professional | null>;
  createProfessional(data: Omit<Professional, 'id'>): Promise<Professional>;
  updateProfessional(id: string, updates: Partial<Professional>): Promise<Professional>;
}
