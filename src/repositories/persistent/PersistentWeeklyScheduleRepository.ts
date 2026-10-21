/**
 * @file PersistentWeeklyScheduleRepository.ts
 * @description Implementación persistente de IWeeklyScheduleRepository.
 * Almacena el historial completo de semanas (DRAFT, PUBLISHED, ARCHIVED).
 * Nunca sobrescribe semanas anteriores.
 */

import { IWeeklyScheduleRepository } from '../IWeeklyScheduleRepository.ts';
import {
  WeeklySchedule,
  WeeklyScheduleStatus,
  DEFAULT_WEEK_DAYS_CONFIG,
  getIsoWeekNumber,
} from '../../domain/appointments/WeeklySchedule.ts';
import { getTodayDateString, addDays } from '../../utils/dateUtils.ts';

const STORAGE_KEY = 'kineturnos_weekly_schedules_v1';

export class PersistentWeeklyScheduleRepository implements IWeeklyScheduleRepository {
  private schedules: Map<string, WeeklySchedule> = new Map();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    let raw: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      raw = localStorage.getItem(STORAGE_KEY);
    }

    if (raw) {
      try {
        const list: WeeklySchedule[] = JSON.parse(raw);
        list.forEach((s) => this.schedules.set(s.id, s));
        return;
      } catch (err) {
        console.warn('Error parsing weekly schedules from localStorage:', err);
      }
    }

    // Inicializar semillas: semana actual y semana previa como PUBLISHED
    this.seedDefaultSchedules();
  }

  private saveToStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      const list = Array.from(this.schedules.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }
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

    // Semana siguiente como DRAFT para que el kinesiólogo pueda prepararla
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

    this.saveToStorage();
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
    this.saveToStorage();
    return schedule;
  }

  async publishSchedule(id: string): Promise<WeeklySchedule> {
    const sched = this.schedules.get(id);
    if (!sched) throw new Error(`Semana no encontrada: ${id}`);
    sched.status = 'PUBLISHED';
    sched.publishedAt = new Date().toISOString();
    sched.updatedAt = new Date().toISOString();
    this.schedules.set(id, sched);
    this.saveToStorage();
    return sched;
  }

  async copyFromPreviousWeek(targetYear: number, targetWeek: number): Promise<WeeklySchedule> {
    // Buscar la semana anterior a la objetivo
    const targetId = `sched_${targetYear}_w${targetWeek}`;
    let existing = this.schedules.get(targetId);

    // Calcular fecha del lunes de la semana objetivo
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

    // Semana anterior = -7 días
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
      status: 'DRAFT', // Se crea como borrador para edición antes de publicar
      days: clonedDays,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.schedules.set(targetId, newSchedule);
    this.saveToStorage();
    return newSchedule;
  }

  async isDateInPublishedSchedule(dateStr: string): Promise<boolean> {
    const sched = await this.getScheduleByDate(dateStr);
    if (!sched) return false;
    return sched.status === 'PUBLISHED';
  }
}
