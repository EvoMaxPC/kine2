/**
 * @file PersistentDecisionRepository.ts
 * @description Implementación persistente del repositorio de decisiones.
 */

import { IDecisionRepository } from '../IDecisionRepository.ts';
import { DecisionItem, DecisionStatus } from '../../types/index.ts';
import { persistentStorageManager } from './PersistentStorageManager.ts';

export class PersistentDecisionRepository implements IDecisionRepository {
  async getPendingDecisions(): Promise<DecisionItem[]> {
    return this.getAllDecisions('PENDING');
  }

  async getAllDecisions(status?: DecisionStatus): Promise<DecisionItem[]> {
    const items = persistentStorageManager.getState().decisionItems || [];
    if (status) {
      return items.filter((d) => d.status === status);
    }
    return [...items];
  }

  async getDecisionById(id: string): Promise<DecisionItem | null> {
    const items = persistentStorageManager.getState().decisionItems || [];
    return items.find((d) => d.id === id) || null;
  }

  async createDecision(data: Omit<DecisionItem, 'id' | 'createdAt'>): Promise<DecisionItem> {
    const newItem: DecisionItem = {
      ...data,
      id: `dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };

    persistentStorageManager.mutate((state) => {
      if (!state.decisionItems) state.decisionItems = [];
      state.decisionItems.unshift(newItem);
    });

    return newItem;
  }

  async updateDecision(id: string, updates: Partial<DecisionItem>): Promise<DecisionItem> {
    let updated: DecisionItem | null = null;

    persistentStorageManager.mutate((state) => {
      if (!state.decisionItems) state.decisionItems = [];
      const idx = state.decisionItems.findIndex((d) => d.id === id);
      if (idx !== -1) {
        state.decisionItems[idx] = {
          ...state.decisionItems[idx],
          ...updates,
        };
        updated = state.decisionItems[idx];
      }
    });

    if (!updated) {
      throw new Error(`Decisión con id ${id} no encontrada.`);
    }

    return updated;
  }

  async updateDecisionStatus(
    id: string,
    status: DecisionStatus | 'ACCEPTED' | 'REJECTED',
    note?: string
  ): Promise<DecisionItem> {
    const finalStatus: DecisionStatus =
      status === 'ACCEPTED' ? 'RESOLVED' : status === 'REJECTED' ? 'DISMISSED' : status;
    return this.updateDecision(id, {
      status: finalStatus,
      resolvedAt: new Date().toISOString(),
      resolutionNote: note,
    });
  }

  async resolveDecision(
    id: string,
    resolution: {
      actionId: string;
      resolvedBy?: string;
      note?: string;
    }
  ): Promise<DecisionItem> {
    return this.updateDecision(id, {
      status: 'RESOLVED',
      resolvedAt: new Date().toISOString(),
      resolvedBy: resolution.resolvedBy || 'STAFF',
      resolutionNote: resolution.note || `Acción ejecutada: ${resolution.actionId}`,
    });
  }

  async dismissDecision(id: string, reason?: string): Promise<DecisionItem> {
    return this.updateDecision(id, {
      status: 'DISMISSED',
      resolvedAt: new Date().toISOString(),
      resolutionNote: reason || 'Descartada por el usuario',
    });
  }

  async deleteDecision(id: string): Promise<void> {
    persistentStorageManager.mutate((state) => {
      if (state.decisionItems) {
        state.decisionItems = state.decisionItems.filter((d) => d.id !== id);
      }
    });
  }
}
