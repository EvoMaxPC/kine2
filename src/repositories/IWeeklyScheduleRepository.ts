/**
 * @file IWeeklyScheduleRepository.ts
 * @description Repositorio para la gestión de agendas semanales (WeeklySchedule).
 */

import { WeeklySchedule } from '../domain/appointments/WeeklySchedule.ts';

export interface IWeeklyScheduleRepository {
  getScheduleByDate(dateStr: string): Promise<WeeklySchedule | null>;
  getScheduleForWeek(year: number, weekNumber: number): Promise<WeeklySchedule | null>;
  getAllSchedules(): Promise<WeeklySchedule[]>;
  saveSchedule(schedule: WeeklySchedule): Promise<WeeklySchedule>;
  publishSchedule(id: string): Promise<WeeklySchedule>;
  copyFromPreviousWeek(targetYear: number, targetWeek: number): Promise<WeeklySchedule>;
  isDateInPublishedSchedule(dateStr: string): Promise<boolean>;
}
