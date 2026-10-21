/**
 * @file AutomationLevel.ts
 * @description Niveles de autonomía operativa para reglas y acciones en KineTurnos.
 */

export type AutomationLevel = 'AUTO' | 'ASK_PROFESSIONAL' | 'MANUAL_ONLY';

export const AutomationLevel = {
  AUTO: 'AUTO' as const,
  ASK_PROFESSIONAL: 'ASK_PROFESSIONAL' as const,
  MANUAL_ONLY: 'MANUAL_ONLY' as const,
};

export interface AutomationLevelConfig {
  level: AutomationLevel;
  description: string;
}
