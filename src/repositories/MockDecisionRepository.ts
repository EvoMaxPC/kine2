/**
 * @file MockDecisionRepository.ts
 * @description Implementación en memoria del repositorio de decisiones.
 */

import { IDecisionRepository } from './IDecisionRepository.ts';
import { DecisionItem, DecisionStatus } from '../types/index.ts';
import { INITIAL_DEMO_DECISIONS } from './persistent/PersistentStorageManager.ts';

export class MockDecisionRepository implements IDecisionRepository {
  private items: DecisionItem[];

  constructor() {
    this.items = JSON.parse(JSON.stringify(INITIAL_DEMO_DECISIONS));
  }

  async getPendingDecisions(): Promise<DecisionItem[]> {
    return this.getAllDecisions('PENDING');
  }

  async getAllDecisions(status?: DecisionStatus): Promise<DecisionItem[]> {
    if (status) {
      return this.items.filter((d) => d.status === status);
    }
    return [...this.items];
  }

  async getDecisionById(id: string): Promise<DecisionItem | null> {
    return this.items.find((d) => d.id === id) || null;
  }

  async createDecision(data: Omit<DecisionItem, 'id' | 'createdAt'>): Promise<DecisionItem> {
    const newItem: DecisionItem = {
      ...data,
      id: `dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    this.items.unshift(newItem);
    return newItem;
  }

  async updateDecision(id: string, updates: Partial<DecisionItem>): Promise<DecisionItem> {
    const idx = this.items.findIndex((d) => d.id === id);
    if (idx === -1) {
      throw new Error(`Decisión con id ${id} no encontrada.`);
    }
    this.items[idx] = { ...this.items[idx], ...updates };
    return this.items[idx];
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
    this.items = this.items.filter((d) => d.id !== id);
  }
}
