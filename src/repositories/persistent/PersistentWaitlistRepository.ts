import { IWaitlistRepository } from '../IWaitlistRepository.ts';
import { WaitlistEntry, WaitlistStatus, SlotOffer, SlotOfferStatus } from '../../types/index.ts';
import { persistentStorageManager } from './PersistentStorageManager.ts';

export class PersistentWaitlistRepository implements IWaitlistRepository {
  async getWaitlistEntries(status?: WaitlistStatus): Promise<WaitlistEntry[]> {
    const state = persistentStorageManager.getState();
    if (!status) return [...state.waitlist];
    return state.waitlist.filter((e) => e.status === status);
  }

  async getActiveEntries(): Promise<WaitlistEntry[]> {
    return this.getWaitlistEntries('ACTIVE');
  }

  async getWaitlistEntryById(id: string): Promise<WaitlistEntry | null> {
    const state = persistentStorageManager.getState();
    const found = state.waitlist.find((e) => e.id === id);
    return found ? { ...found } : null;
  }

  async createWaitlistEntry(
    data: Omit<WaitlistEntry, 'id' | 'createdAt'>
  ): Promise<WaitlistEntry> {
    const newEntry: WaitlistEntry = {
      ...data,
      id: `wl_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    persistentStorageManager.mutate((st) => {
      st.waitlist.push(newEntry);
    });

    return { ...newEntry };
  }

  async updateWaitlistEntry(
    id: string,
    updates: Partial<WaitlistEntry>
  ): Promise<WaitlistEntry> {
    let updated: WaitlistEntry | null = null;
    persistentStorageManager.mutate((st) => {
      const idx = st.waitlist.findIndex((e) => e.id === id);
      if (idx === -1) {
        throw new Error(`Entrada de lista de espera no encontrada: ${id}`);
      }
      st.waitlist[idx] = { ...st.waitlist[idx], ...updates };
      updated = { ...st.waitlist[idx] };
    });

    return updated!;
  }

  async deleteWaitlistEntry(id: string): Promise<void> {
    persistentStorageManager.mutate((st) => {
      st.waitlist = st.waitlist.filter((e) => e.id !== id);
    });
  }

  async createSlotOffer(data: Omit<SlotOffer, 'id' | 'offeredAt'>): Promise<SlotOffer> {
    const newOffer: SlotOffer = {
      ...data,
      id: `offer_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      offeredAt: new Date().toISOString(),
    };

    persistentStorageManager.mutate((st) => {
      st.slotOffers.push(newOffer);
    });

    return { ...newOffer };
  }

  async getOffersByEntryId(entryId: string): Promise<SlotOffer[]> {
    const state = persistentStorageManager.getState();
    return state.slotOffers.filter((o) => o.waitlistEntryId === entryId);
  }

  async getOfferById(id: string): Promise<SlotOffer | null> {
    const state = persistentStorageManager.getState();
    const found = state.slotOffers.find((o) => o.id === id);
    return found ? { ...found } : null;
  }

  async updateSlotOfferStatus(id: string, status: SlotOfferStatus): Promise<SlotOffer> {
    let updated: SlotOffer | null = null;
    persistentStorageManager.mutate((st) => {
      const idx = st.slotOffers.findIndex((o) => o.id === id);
      if (idx === -1) throw new Error(`Oferta no encontrada: ${id}`);
      st.slotOffers[idx] = { ...st.slotOffers[idx], status };
      updated = { ...st.slotOffers[idx] };
    });

    return updated!;
  }

  async updateOfferStatus(id: string, status: SlotOfferStatus): Promise<SlotOffer> {
    return this.updateSlotOfferStatus(id, status);
  }

  async updateEntryStatus(id: string, status: WaitlistStatus): Promise<WaitlistEntry> {
    return this.updateWaitlistEntry(id, { status });
  }
}
