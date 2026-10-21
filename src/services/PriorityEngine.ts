/**
 * @file PriorityEngine.ts
 * @description Motor de priorización operativa para alertas, solicitudes y decisiones.
 */

import { DecisionPriority } from '../types/index.ts';

export interface PriorityContext {
  itemType: string;
  minutesWaitingInRoom?: number;
  hoursUntilAppointment?: number;
  hasScheduleConflict?: boolean;
  isCancellationToday?: boolean;
  isOverdue?: boolean;
  patientRequestedOverbooking?: boolean;
}

export class PriorityEngine {
  /**
   * Determina el nivel de prioridad operacional según reglas clínicas.
   */
  static evaluatePriority(context: PriorityContext): DecisionPriority {
    // CRITICAL: conflicto de agenda, sobreturno o paciente esperando >15 min
    if (context.hasScheduleConflict || context.patientRequestedOverbooking) {
      return 'CRITICAL';
    }
    if (context.minutesWaitingInRoom && context.minutesWaitingInRoom >= 15) {
      return 'CRITICAL';
    }

    // HIGH: turno cancelado hoy sin cubrir, turno en <12h, recordatorio vencido
    if (context.isCancellationToday) {
      return 'HIGH';
    }
    if (context.hoursUntilAppointment !== undefined && context.hoursUntilAppointment <= 12) {
      return 'HIGH';
    }
    if (context.isOverdue) {
      return 'HIGH';
    }

    // NORMAL: flujo estándar
    if (
      context.itemType === 'STANDARD_REQUEST' ||
      context.itemType === 'WAITLIST_MATCH' ||
      context.itemType === 'REMINDER_DUE'
    ) {
      return 'NORMAL';
    }

    // LOW
    return 'LOW';
  }

  static getPriorityBadgeClasses(priority: DecisionPriority): { bg: string; text: string; border: string } {
    switch (priority) {
      case 'CRITICAL':
        return {
          bg: 'bg-rose-50 dark:bg-rose-950/60',
          text: 'text-rose-700 dark:text-rose-300',
          border: 'border-rose-200 dark:border-rose-800',
        };
      case 'HIGH':
        return {
          bg: 'bg-amber-50 dark:bg-amber-950/60',
          text: 'text-amber-700 dark:text-amber-300',
          border: 'border-amber-200 dark:border-amber-800',
        };
      case 'NORMAL':
        return {
          bg: 'bg-teal-50 dark:bg-teal-950/60',
          text: 'text-teal-800 dark:text-teal-300',
          border: 'border-teal-200 dark:border-teal-800',
        };
      case 'LOW':
      default:
        return {
          bg: 'bg-stone-50 dark:bg-stone-900',
          text: 'text-stone-600 dark:text-stone-400',
          border: 'border-stone-200 dark:border-stone-800',
        };
    }
  }
}
