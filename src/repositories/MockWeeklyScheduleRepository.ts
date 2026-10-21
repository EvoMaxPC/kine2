/**
 * @file MockWeeklyScheduleRepository.ts
 * @description Implementación en memoria de IWeeklyScheduleRepository para tests y sandbox.
 */

import { IWeeklyScheduleRepository } from './IWeeklyScheduleRepository.ts';
import {
  WeeklySchedule,
  DEFAULT_WEEK_DAYS_CONFIG,
  getIsoWeekNumber,
} from '../domain/appointments/WeeklySchedule.ts';
import { getTodayDateString, addDays } from '../utils/dateUtils.ts';

export class MockWeeklyScheduleRepository implements IWeeklyScheduleRepository {
  private schedules: Map<string, WeeklySchedule> = new Map();

  constructor() {
    this.seedDefaultSchedules();
  }

  private seedDefaultSchedules() {
    const today = getTodayDateString();
    const curr = getIsoWeekNumber(today);

    // Semana actual como PUBLISHED
    const currentSchedule: WeeklySchedule = {
      id: `sched_${curr.year}_w${curr.weekNumber}`,
      year: curr.year,
      weekNumber: curr.weekNumber,
      startDate: curr.mondayStr,
      endDate: curr.sundayStr,
      status: 'PUBLISHED',
      days: JSON.parse(JSON.stringify(DEFAULT_WEEK_DAYS_CONFIG)),
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.schedules.set(currentSchedule.id, currentSchedule);

    // Semana anterior como ARCHIVED
    const pastMondayStr = addDays(curr.mondayStr, -7);
    const prev = getIsoWeekNumber(pastMondayStr);
    const prevSchedule: WeeklySchedule = {
      id: `sched_${prev.year}_w${prev.weekNumber}`,
      year: prev.year,
      weekNumber: prev.weekNumber,
      startDate: prev.mondayStr,
      endDate: prev.sundayStr,
      status: 'ARCHIVED',
      days: JSON.parse(JSON.stringify(DEFAULT_WEEK_DAYS_CONFIG)),
      publishedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      archivedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.schedules.set(prevSchedule.id, prevSchedule);

    // Semana siguiente como DRAFT
    const nextMondayStr = addDays(curr.mondayStr, 7);
    const next = getIsoWeekNumber(nextMondayStr);
    const nextSchedule: WeeklySchedule = {
      id: `sched_${next.year}_w${next.weekNumber}`,
      year: next.year,
      weekNumber: next.weekNumber,
      startDate: next.mondayStr,
      endDate: next.sundayStr,
      status: 'DRAFT',
      days: JSON.parse(JSON.stringify(DEFAULT_WEEK_DAYS_CONFIG)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.schedules.set(nextSchedule.id, nextSchedule);
  }

  async getScheduleByDate(dateStr: string): Promise<WeeklySchedule | null> {
    const { year, weekNumber } = getIsoWeekNumber(dateStr);
    return this.getScheduleForWeek(year, weekNumber);
  }

  async getScheduleForWeek(year: number, weekNumber: number): Promise<WeeklySchedule | null> {
    const id = `sched_${year}_w${weekNumber}`;
    return this.schedules.get(id) || null;
  }

  async getAllSchedules(): Promise<WeeklySchedule[]> {
    return Array.from(this.schedules.values()).sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  async saveSchedule(schedule: WeeklySchedule): Promise<WeeklySchedule> {
    schedule.updatedAt = new Date().toISOString();
    this.schedules.set(schedule.id, schedule);
    return schedule;
  }

  async publishSchedule(id: string): Promise<WeeklySchedule> {
    const sched = this.schedules.get(id);
    if (!sched) throw new Error(`Semana no encontrada: ${id}`);
    sched.status = 'PUBLISHED';
    sched.publishedAt = new Date().toISOString();
    sched.updatedAt = new Date().toISOString();
    this.schedules.set(id, sched);
    return sched;
  }

  async copyFromPreviousWeek(targetYear: number, targetWeek: number): Promise<WeeklySchedule> {
    const targetId = `sched_${targetYear}_w${targetWeek}`;
    let existing = this.schedules.get(targetId);

    let targetMondayStr: string;
    let targetSundayStr: string;
    if (existing) {
      targetMondayStr = existing.startDate;
      targetSundayStr = existing.endDate;
    } else {
      const today = getTodayDateString();
      const curr = getIsoWeekNumber(today);
      const weeksDiff = (targetYear - curr.year) * 52 + (targetWeek - curr.weekNumber);
      targetMondayStr = addDays(curr.mondayStr, weeksDiff * 7);
      targetSundayStr = addDays(targetMondayStr, 6);
    }

    const prevMondayStr = addDays(targetMondayStr, -7);
    const prevInfo = getIsoWeekNumber(prevMondayStr);
    const prevSched = await this.getScheduleForWeek(prevInfo.year, prevInfo.weekNumber);

    const clonedDays = prevSched?.days
      ? JSON.parse(JSON.stringify(prevSched.days))
      : JSON.parse(JSON.stringify(DEFAULT_WEEK_DAYS_CONFIG));

    const newSchedule: WeeklySchedule = {
      id: targetId,
      year: targetYear,
      weekNumber: targetWeek,
      startDate: targetMondayStr,
      endDate: targetSundayStr,
      status: 'DRAFT',
      days: clonedDays,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.schedules.set(targetId, newSchedule);
    return newSchedule;
  }

  async isDateInPublishedSchedule(dateStr: string): Promise<boolean> {
    // Si la fecha cae en cualquier semana registrada como PUBLISHED, retornar true
    // O si está dentro del horizonte por defecto del mes de la fecha actual
    const sched = await this.getScheduleByDate(dateStr);
    if (sched) {
      return sched.status === 'PUBLISHED';
    }
    // Si no está registrado explícitamente, para tests se considera published si es la semana de prueba
    return true;
  }
}
