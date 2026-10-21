export type WaitlistStatus = 'ACTIVE' | 'OFFERED' | 'BOOKED' | 'EXPIRED' | 'REMOVED';
export type WaitlistPriority = 'NORMAL' | 'HIGH' | 'URGENT';

export interface WaitlistEntry {
  id: string;
  patientId: string;
  professionalId?: string; // opcional: si prefiere un profesional puntual
  appointmentTypeId?: string;
  preferredDays: number[]; // 1 = Lunes, ..., 5 = Viernes
  preferredTimeRanges: { start: string; end: string }[]; // e.g. [{ start: '09:00', end: '13:00' }]
  earliestDate?: string; // YYYY-MM-DD
  latestDate?: string;   // YYYY-MM-DD
  priority: WaitlistPriority;
  status: WaitlistStatus;
  createdAt: string; // ISO 8601
  notes?: string; // notas administrativas
}

export type SlotOfferStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

export interface SlotOffer {
  id: string;
  waitlistEntryId: string;
  patientId: string;
  professionalId: string;
  slotStartAt: string;
  slotEndAt: string;
  durationMinutes: number;
  offeredAt: string;
  expiresAt: string;
  status: SlotOfferStatus;
  whatsappMessageId?: string;
}
