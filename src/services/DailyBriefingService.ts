/**
 * @file DailyBriefingService.ts
 * @description Generador del resumen operativo de inicio de jornada para el kinesiólogo (máximo 5 puntos).
 */

import { TodayOverviewSummary, DaySlotViewModel } from './AppointmentService.ts';
import { AppointmentStatus } from '../types/index.ts';
import { formatTimeHs, parseTimeFromIso } from '../utils/dateUtils.ts';

export interface DailyBriefingItem {
  id: string;
  iconType: 'calendar' | 'clock' | 'alert' | 'inbox' | 'gap';
  text: string;
  highlight?: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
}

export interface DailyBriefing {
  dateString: string;
  items: DailyBriefingItem[];
}

export class DailyBriefingService {
  static generateBriefing(
    overview: TodayOverviewSummary | null | undefined,
    schedule: DaySlotViewModel[] = []
  ): DailyBriefing {
    const items: DailyBriefingItem[] = [];

    if (!overview) {
      return {
        dateString: '',
        items: [],
      };
    }

    try {
      const appointments = Array.isArray(overview.appointments) ? overview.appointments : [];
      const totalCount = overview.totalAppointmentsCount ?? appointments.length;

      // 1. Total turnos hoy
      items.push({
        id: 'brief_total',
        iconType: 'calendar',
        text: `Hoy tenés ${totalCount} turno${totalCount === 1 ? '' : 's'} programado${totalCount === 1 ? '' : 's'}.`,
        highlight: `${totalCount} turnos`,
        priority: 'NORMAL',
      });

      // 2. Primer paciente
      const sortedApps = [...appointments]
        .filter((a) => a && a.startAt && a.status !== AppointmentStatus.CANCELLED)
        .sort((a, b) => (a.startAt || '').localeCompare(b.startAt || ''));

      if (sortedApps.length > 0) {
        const first = sortedApps[0];
        const timeHs = formatTimeHs(parseTimeFromIso(first.startAt));
        const pName = first.patient ? `${first.patient.firstName || ''} ${first.patient.lastName || ''}`.trim() : 'Primer paciente';
        items.push({
          id: 'brief_first',
          iconType: 'clock',
          text: `Primer paciente a las ${timeHs} hs (${pName}).`,
          highlight: `${timeHs} hs`,
          priority: 'NORMAL',
        });
      }

      // 3. Pacientes sin confirmar para hoy
      const unconfirmed = appointments.filter(
        (a) => a && a.status === AppointmentStatus.CONFIRMED && a.confirmationStatus !== 'CONFIRMED'
      );
      if (unconfirmed.length > 0) {
        items.push({
          id: 'brief_unconfirmed',
          iconType: 'alert',
          text: `${unconfirmed.length} paciente${unconfirmed.length === 1 ? '' : 's'} todavía no confirmó asistencia para hoy.`,
          highlight: `${unconfirmed.length} sin confirmar`,
          priority: 'HIGH',
        });
      }

      // 4. Solicitudes pendientes por responder
      const pendingReqs = overview.pendingRequestsCount ?? (overview.pendingRequests?.length || 0);
      if (pendingReqs > 0) {
        items.push({
          id: 'brief_pending',
          iconType: 'inbox',
          text: `${pendingReqs} solicitud${pendingReqs === 1 ? '' : 'es'} pendiente${pendingReqs === 1 ? '' : 's'} de respuesta.`,
          highlight: `${pendingReqs} pendientes`,
          priority: 'HIGH',
        });
      }

      // 5. Hueco libre más notable en la agenda
      const safeSchedule = Array.isArray(schedule) ? schedule : [];
      let biggestGap: { start: string; end: string; duration: number } | null = null;
      let currentGapStart: string | null = null;
      let currentGapCount = 0;

      for (const slot of safeSchedule) {
        if (!slot) continue;
        if (slot.isAvailable && !slot.isPast) {
          if (!currentGapStart) currentGapStart = slot.time;
          currentGapCount++;
        } else {
          if (currentGapStart && currentGapCount > 0) {
            if (!biggestGap || currentGapCount > biggestGap.duration) {
              biggestGap = { start: currentGapStart, end: slot.time, duration: currentGapCount };
            }
            currentGapStart = null;
            currentGapCount = 0;
          }
        }
      }

      if (biggestGap && biggestGap.duration >= 1) {
        items.push({
          id: 'brief_gap',
          iconType: 'gap',
          text: `Tenés un hueco libre de ${biggestGap.start} a ${biggestGap.end} hs disponible para asignar.`,
          highlight: `${biggestGap.start} a ${biggestGap.end} hs`,
          priority: 'NORMAL',
        });
      }
    } catch (e) {
      console.warn('DailyBriefingService: error calculating briefing items:', e);
    }

    return {
      dateString: overview.dateString || '',
      items: items.slice(0, 5),
    };
  }
}
