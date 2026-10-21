import { IRequestRepository } from '../IRequestRepository.ts';
import { AppointmentRequest, RequestStatus } from '../../types/index.ts';
import { persistentStorageManager } from './PersistentStorageManager.ts';

export class PersistentRequestRepository implements IRequestRepository {
  async getPendingRequests(professionalId?: string): Promise<AppointmentRequest[]> {
    const state = persistentStorageManager.getState();
    return state.requests
      .filter((r) => r.status === RequestStatus.PENDING && (!professionalId || r.professionalId === professionalId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAllRequests(): Promise<AppointmentRequest[]> {
    const state = persistentStorageManager.getState();
    return [...state.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getRequestById(id: string): Promise<AppointmentRequest | null> {
    const state = persistentStorageManager.getState();
    const found = state.requests.find((r) => r.id === id);
    return found ? { ...found } : null;
  }

  async createRequest(
    data: Omit<AppointmentRequest, 'id' | 'createdAt'>
  ): Promise<AppointmentRequest> {
    const newRequest: AppointmentRequest = {
      ...data,
      id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    persistentStorageManager.mutate((st) => {
      st.requests.push(newRequest);
    });

    return { ...newRequest };
  }

  async updateRequestStatus(
    id: string,
    status: RequestStatus,
    resolutionData?: {
      resolvedBy?: string;
      resolutionNote?: string;
      proposedAlternativeStartAt?: string;
      proposedAlternativeEndAt?: string;
    }
  ): Promise<AppointmentRequest> {
    let updated: AppointmentRequest | null = null;
    persistentStorageManager.mutate((st) => {
      const idx = st.requests.findIndex((r) => r.id === id);
      if (idx === -1) {
        throw new Error(`Solicitud no encontrada: ${id}`);
      }
      st.requests[idx] = {
        ...st.requests[idx],
        status,
        resolvedAt: new Date().toISOString(),
        resolvedBy: resolutionData?.resolvedBy,
        resolutionNote: resolutionData?.resolutionNote,
        proposedAlternativeStartAt: resolutionData?.proposedAlternativeStartAt,
        proposedAlternativeEndAt: resolutionData?.proposedAlternativeEndAt,
      };
      updated = { ...st.requests[idx] };
    });

    return updated!;
  }
}
