import { AutomationRule, AutomationLevel } from '../types/index.ts';

export interface IAutomationRuleRepository {
  getRules(): Promise<AutomationRule[]>;
  getRuleById(id: string): Promise<AutomationRule | null>;
  updateRule(id: string, updates: Partial<AutomationRule>): Promise<AutomationRule | null>;
  setRuleLevel(id: string, level: AutomationLevel): Promise<AutomationRule | null>;
  toggleRuleEnabled(id: string, enabled: boolean): Promise<AutomationRule | null>;
  resetToDefaults(): Promise<AutomationRule[]>;
}
