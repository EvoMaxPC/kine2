/**
 * @file FirebasePatientRepository.ts
 * @description Future Phase 2 Cloud Firestore integration for Patient administrative records.
 */

import { IPatientRepository } from '../IPatientRepository.ts';
import { Patient } from '../../types/index.ts';

export class FirebasePatientRepository implements IPatientRepository {
  async getAllPatients(): Promise<Patient[]> {
    throw new Error('FirebasePatientRepository: No aprovisionado en Fase 1.');
  }

  async getPatientById(id: string): Promise<Patient | null> {
    throw new Error('FirebasePatientRepository: No aprovisionado en Fase 1.');
  }

  async getPatientByPhone(phone: string): Promise<Patient | null> {
    throw new Error('FirebasePatientRepository: No aprovisionado en Fase 1.');
  }

  async searchPatients(query: string): Promise<Patient[]> {
    throw new Error('FirebasePatientRepository: No aprovisionado en Fase 1.');
  }

  async createPatient(data: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient> {
    throw new Error('FirebasePatientRepository: No aprovisionado en Fase 1.');
  }

  async updatePatient(id: string, updates: Partial<Patient>): Promise<Patient> {
    throw new Error('FirebasePatientRepository: No aprovisionado en Fase 1.');
  }
}
