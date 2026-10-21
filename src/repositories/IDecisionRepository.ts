/**
 * @file IDecisionRepository.ts
 * @description Repositorio de situaciones que requieren decisión humana (Bandeja de Decisiones).
 */

import { DecisionItem, DecisionStatus } from '../types/index.ts';

export interface IDecisionRepository {
  getPendingDecisions(): Promise<DecisionItem[]>;
  getAllDecisions(status?: DecisionStatus): Promise<DecisionItem[]>;
  getDecisionById(id: string): Promise<DecisionItem | null>;
  createDecision(data: any): Promise<DecisionItem>;
  updateDecision(id: string, updates: Partial<DecisionItem>): Promise<DecisionItem>;
  updateDecisionStatus(id: string, status: DecisionStatus | 'ACCEPTED' | 'REJECTED', note?: string): Promise<DecisionItem>;
  resolveDecision(
    id: string,
    resolution: {
      actionId: string;
      resolvedBy?: string;
      note?: string;
    }
  ): Promise<DecisionItem>;
  dismissDecision(id: string, reason?: string): Promise<DecisionItem>;
  deleteDecision(id: string): Promise<void>;
}
