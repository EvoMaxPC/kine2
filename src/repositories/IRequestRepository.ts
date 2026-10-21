import { AppointmentRequest, RequestStatus } from '../types/index.ts';

export interface IRequestRepository {
  getPendingRequests(professionalId?: string): Promise<AppointmentRequest[]>;
  getAllRequests(): Promise<AppointmentRequest[]>;
  getRequestById(id: string): Promise<AppointmentRequest | null>;
  createRequest(
    data: Omit<AppointmentRequest, 'id' | 'createdAt' | 'status'>
  ): Promise<AppointmentRequest>;
  updateRequestStatus(
    id: string,
    status: RequestStatus,
    resolutionData?: {
      resolvedBy?: string;
      resolutionNote?: string;
      proposedAlternativeStartAt?: string;
      proposedAlternativeEndAt?: string;
    }
  ): Promise<AppointmentRequest>;
}
