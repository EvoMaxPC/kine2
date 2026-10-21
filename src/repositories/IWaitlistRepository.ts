import { WaitlistEntry, WaitlistStatus, SlotOffer, SlotOfferStatus } from '../types/index.ts';

export interface IWaitlistRepository {
  getWaitlistEntries(status?: WaitlistStatus): Promise<WaitlistEntry[]>;
  getActiveEntries(): Promise<WaitlistEntry[]>;
  getWaitlistEntryById(id: string): Promise<WaitlistEntry | null>;
  createWaitlistEntry(data: Omit<WaitlistEntry, 'id' | 'createdAt'>): Promise<WaitlistEntry>;
  updateWaitlistEntry(id: string, updates: Partial<WaitlistEntry>): Promise<WaitlistEntry>;
  updateEntryStatus(id: string, status: WaitlistStatus): Promise<WaitlistEntry>;
  deleteWaitlistEntry(id: string): Promise<void>;
  
  createSlotOffer(data: Omit<SlotOffer, 'id' | 'offeredAt'>): Promise<SlotOffer>;
  getOffersByEntryId(entryId: string): Promise<SlotOffer[]>;
  getOfferById(id: string): Promise<SlotOffer | null>;
  updateSlotOfferStatus(id: string, status: SlotOfferStatus): Promise<SlotOffer>;
  updateOfferStatus(id: string, status: SlotOfferStatus): Promise<SlotOffer>;
}
