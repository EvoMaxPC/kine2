/**
 * @file WeeklySchedule.ts
 * @description Modelo de dominio para la Planificación y Agenda Semanal (WeeklySchedule).
 * 
 * Reglas de negocio:
 * - El domingo el kinesiólogo puede preparar la semana siguiente.
 * - Flujo: COPIAR SEMANA ANTERIOR -> Editar días y horarios -> PUBLICAR SEMANA.
 * - Estados: DRAFT (Borrador), PUBLISHED (Publicada), ARCHIVED (Archivada).
 * - La Secretaria Digital SOLAMENTE puede ofrecer turnos de semanas PUBLISHED.
 * - Las semanas anteriores deben conservarse (nunca sobrescribir historial).
 */

export type WeeklyScheduleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface DayScheduleSlotRule {
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  dayName: string;
  active: boolean;
  start: string; // "08:00"
  end: string;   // "19:00"
  intervals?: Array<{ start: string; end: string }>;
}

export interface WeeklySchedule {
  id: string; // ej: "sched_2026_w40"
  year: number;
  weekNumber: number;
  startDate: string; // YYYY-MM-DD (Lunes de la semana)
  endDate: string;   // YYYY-MM-DD (Domingo de la semana)
  status: WeeklyScheduleStatus;
  days: DayScheduleSlotRule[];
  publishedAt?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const DEFAULT_WEEK_DAYS_CONFIG: DayScheduleSlotRule[] = [
  { dayOfWeek: 1, dayName: 'Lunes', active: true, start: '08:00', end: '19:00', intervals: [{ start: '08:00', end: '12:00' }, { start: '15:00', end: '19:00' }] },
  { dayOfWeek: 2, dayName: 'Martes', active: true, start: '08:00', end: '19:00', intervals: [{ start: '08:00', end: '12:00' }, { start: '15:00', end: '19:00' }] },
  { dayOfWeek: 3, dayName: 'Miércoles', active: true, start: '08:00', end: '19:00', intervals: [{ start: '08:00', end: '12:00' }, { start: '15:00', end: '19:00' }] },
  { dayOfWeek: 4, dayName: 'Jueves', active: true, start: '08:00', end: '19:00', intervals: [{ start: '08:00', end: '12:00' }, { start: '15:00', end: '19:00' }] },
  { dayOfWeek: 5, dayName: 'Viernes', active: true, start: '08:00', end: '19:00', intervals: [{ start: '08:00', end: '12:00' }, { start: '15:00', end: '19:00' }] },
  { dayOfWeek: 6, dayName: 'Sábado', active: false, start: '09:00', end: '13:00', intervals: [{ start: '09:00', end: '13:00' }] },
  { dayOfWeek: 0, dayName: 'Domingo', active: false, start: '09:00', end: '13:00', intervals: [] },
];

/**
 * Calcula el número de semana ISO para una fecha YYYY-MM-DD
 */
export function getIsoWeekNumber(dateStr: string): { year: number; weekNumber: number; mondayStr: string; sundayStr: string } {
  const d = new Date(`${dateStr}T12:00:00`);
  const day = d.getDay(); // 0 is Sunday
  const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMonday));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const mondayStr = monday.toISOString().split('T')[0];
  const sundayStr = sunday.toISOString().split('T')[0];

  // Cálculo de semana ISO
  const target = new Date(monday.valueOf());
  const dayNr = (monday.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

  return {
    year: monday.getFullYear(),
    weekNumber,
    mondayStr,
    sundayStr,
  };
}
