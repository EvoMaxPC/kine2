import { IAutomationRuleRepository } from './IAutomationRuleRepository.ts';
import { AutomationRule, AutomationLevel, DEFAULT_AUTOMATION_RULES } from '../types/index.ts';

export class MockAutomationRuleRepository implements IAutomationRuleRepository {
  private rules: AutomationRule[] = [];

  constructor(initialRules?: AutomationRule[]) {
    this.rules = JSON.parse(JSON.stringify(initialRules || DEFAULT_AUTOMATION_RULES));
  }

  async getRules(): Promise<AutomationRule[]> {
    return [...this.rules].sort((a, b) => b.priority - a.priority);
  }

  async getRuleById(id: string): Promise<AutomationRule | null> {
    const r = this.rules.find((rule) => rule.id === id);
    return r ? { ...r } : null;
  }

  async updateRule(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule | null> {
    const idx = this.rules.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.rules[idx] = { ...this.rules[idx], ...updates };
    return { ...this.rules[idx] };
  }

  async setRuleLevel(id: string, level: AutomationLevel): Promise<AutomationRule | null> {
    return this.updateRule(id, { level });
  }

  async toggleRuleEnabled(id: string, enabled: boolean): Promise<AutomationRule | null> {
    return this.updateRule(id, { enabled });
  }

  async resetToDefaults(): Promise<AutomationRule[]> {
    this.rules = JSON.parse(JSON.stringify(DEFAULT_AUTOMATION_RULES));
    return [...this.rules];
  }
}
