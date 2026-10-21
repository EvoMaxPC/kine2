import { IWaitlistRepository } from './IWaitlistRepository.ts';
import { WaitlistEntry, WaitlistStatus, SlotOffer, SlotOfferStatus } from '../types/index.ts';
import { DEMO_WAITLIST_ENTRIES } from '../mock/demoData.ts';

export class MockWaitlistRepository implements IWaitlistRepository {
  private entries: WaitlistEntry[] = [];
  private offers: SlotOffer[] = [];

  constructor(initialEntries?: WaitlistEntry[]) {
    this.entries = JSON.parse(
      JSON.stringify(initialEntries || DEMO_WAITLIST_ENTRIES)
    );
  }

  async getWaitlistEntries(status?: WaitlistStatus): Promise<WaitlistEntry[]> {
    if (!status) return [...this.entries];
    return this.entries.filter((e) => e.status === status);
  }

  async getActiveEntries(): Promise<WaitlistEntry[]> {
    return this.getWaitlistEntries('ACTIVE');
  }

  async getWaitlistEntryById(id: string): Promise<WaitlistEntry | null> {
    const entry = this.entries.find((e) => e.id === id);
    return entry ? { ...entry } : null;
  }

  async createWaitlistEntry(data: Omit<WaitlistEntry, 'id' | 'createdAt'>): Promise<WaitlistEntry> {
    const newEntry: WaitlistEntry = {
      ...data,
      id: `wl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
    };
    this.entries.push(newEntry);
    return { ...newEntry };
  }

  async updateWaitlistEntry(id: string, updates: Partial<WaitlistEntry>): Promise<WaitlistEntry> {
    const idx = this.entries.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error(`Entrada de lista de espera no encontrada: ${id}`);
    this.entries[idx] = { ...this.entries[idx], ...updates };
    return { ...this.entries[idx] };
  }

  async deleteWaitlistEntry(id: string): Promise<void> {
    this.entries = this.entries.filter((e) => e.id !== id);
  }

  async createSlotOffer(data: Omit<SlotOffer, 'id' | 'offeredAt'>): Promise<SlotOffer> {
    const newOffer: SlotOffer = {
      ...data,
      id: `offer_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      offeredAt: new Date().toISOString(),
    };
    this.offers.push(newOffer);
    return { ...newOffer };
  }

  async getOffersByEntryId(entryId: string): Promise<SlotOffer[]> {
    return this.offers.filter((o) => o.waitlistEntryId === entryId);
  }

  async getOfferById(id: string): Promise<SlotOffer | null> {
    const offer = this.offers.find((o) => o.id === id);
    return offer ? { ...offer } : null;
  }

  async updateSlotOfferStatus(id: string, status: SlotOfferStatus): Promise<SlotOffer> {
    const idx = this.offers.findIndex((o) => o.id === id);
    if (idx === -1) throw new Error(`Oferta no encontrada: ${id}`);
    this.offers[idx] = { ...this.offers[idx], status };
    return { ...this.offers[idx] };
  }

  async updateOfferStatus(id: string, status: SlotOfferStatus): Promise<SlotOffer> {
    return this.updateSlotOfferStatus(id, status);
  }

  async updateEntryStatus(id: string, status: WaitlistStatus): Promise<WaitlistEntry> {
    return this.updateWaitlistEntry(id, { status });
  }
}
