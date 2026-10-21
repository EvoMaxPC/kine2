import { IRequestRepository } from './IRequestRepository.ts';
import { AppointmentRequest, RequestStatus } from '../types/index.ts';
import { DEMO_INITIAL_REQUESTS } from '../mock/demoData.ts';

export class MockRequestRepository implements IRequestRepository {
  private requests: AppointmentRequest[] = [];

  constructor(initialData?: AppointmentRequest[]) {
    this.requests = JSON.parse(
      JSON.stringify(initialData || DEMO_INITIAL_REQUESTS)
    );
  }

  async getPendingRequests(professionalId?: string): Promise<AppointmentRequest[]> {
    return this.requests
      .filter((r) => {
        if (r.status !== RequestStatus.PENDING) return false;
        if (professionalId && r.professionalId !== professionalId) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getAllRequests(): Promise<AppointmentRequest[]> {
    return [...this.requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getRequestById(id: string): Promise<AppointmentRequest | null> {
    const found = this.requests.find((r) => r.id === id);
    return found ? { ...found } : null;
  }

  async createRequest(
    data: Omit<AppointmentRequest, 'id' | 'createdAt' | 'status'>
  ): Promise<AppointmentRequest> {
    const newReq: AppointmentRequest = {
      ...data,
      id: `req_demo_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      status: RequestStatus.PENDING,
      createdAt: new Date().toISOString(),
    };
    this.requests.unshift(newReq);
    return { ...newReq };
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
    const idx = this.requests.findIndex((r) => r.id === id);
    if (idx === -1) {
      throw new Error(`Solicitud no encontrada: ${id}`);
    }

    const current = this.requests[idx];
    if (current.status !== RequestStatus.PENDING && status !== current.status) {
      throw new Error('Esta solicitud ya fue resuelta previamente.');
    }

    this.requests[idx] = {
      ...current,
      status,
      resolvedAt: new Date().toISOString(),
      resolvedBy: resolutionData?.resolvedBy || 'STAFF',
      resolutionNote: resolutionData?.resolutionNote,
      proposedAlternativeStartAt: resolutionData?.proposedAlternativeStartAt,
      proposedAlternativeEndAt: resolutionData?.proposedAlternativeEndAt,
    };

    return { ...this.requests[idx] };
  }
}
