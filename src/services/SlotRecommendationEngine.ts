/**
 * @file SlotRecommendationEngine.ts
 * @description Motor de recomendación de turnos con ranking inteligente y optimización de huecos (Gap Minimization).
 */

import { DaySlotViewModel } from './AppointmentService.ts';
import {
  formatHumanDate,
  formatTimeHs,
  addDays,
  getTodayDateString,
} from '../utils/dateUtils.ts';
import { CandidateSlot } from '../types/index.ts';

export interface SlotRecommendationPreferences {
  preferredDate?: string; // YYYY-MM-DD
  preferredTimeOfDay?: 'MORNING' | 'AFTERNOON' | 'ANY'; // mañana (<13:00) o tarde (>=13:00)
  preferredDayOfWeek?: number; // 1=Lun, ..., 5=Vie
  preferredProfessionalId?: string;
  durationMinutes?: number;
}

export interface RankedSlotOption extends CandidateSlot {
  score: number;
  gapScore: number;
  isGapFilling: boolean;
  matchReason?: string;
}

export class SlotRecommendationEngine {
  /**
   * Ranks available slots across multiple days according to patient preference and gap minimization.
   * Never contrariates explicit user preference, but prioritizes gap-filling slots among equals.
   */
  static rankSlots(
    dailySchedules: Array<{ date: string; slots: DaySlotViewModel[] }>,
    prefs: SlotRecommendationPreferences = {},
    limit: number = 3
  ): { primarySlots: RankedSlotOption[]; allSlots: RankedSlotOption[] } {
    const candidates: RankedSlotOption[] = [];

    dailySchedules.forEach(({ date, slots }, dayIdx) => {
      // Find occupied slot indices to detect single-slot gaps (e.g. booked -> free -> booked)
      const slotCount = slots.length;

      slots.forEach((slot, slotIdx) => {
        if (!slot.isAvailable || slot.isPast) return;

        const [h, m] = slot.time.split(':').map(Number);
        const totalMinutes = h * 60 + m;
        const isMorning = totalMinutes < 13 * 60;

        // Gap detection: check previous and next slots
        const prevSlot = slotIdx > 0 ? slots[slotIdx - 1] : null;
        const nextSlot = slotIdx < slotCount - 1 ? slots[slotIdx + 1] : null;

        const prevIsBusy = prevSlot && (!prevSlot.isAvailable || !!prevSlot.appointment || !!prevSlot.isBlocked);
        const nextIsBusy = nextSlot && (!nextSlot.isAvailable || !!nextSlot.appointment || !!nextSlot.isBlocked);

        // Gap Filling: highest value if sandwiched between two occupied slots!
        const isIsolatedGap = !!(prevIsBusy && nextIsBusy);
        const isContiguousToBusy = !!(prevIsBusy || nextIsBusy);

        let gapScore = 0;
        if (isIsolatedGap) {
          gapScore = 50; // Cierra un hueco inútil aislado
        } else if (isContiguousToBusy) {
          gapScore = 25; // Expande un bloque continuo de atención
        }

        // Preference scoring
        let prefScore = 100 - dayIdx * 10; // Closer days have baseline advantage

        // Day of week match
        const dateObj = new Date(`${date}T12:00:00`);
        const dayOfWeek = dateObj.getDay();
        if (prefs.preferredDayOfWeek !== undefined) {
          if (dayOfWeek === prefs.preferredDayOfWeek) {
            prefScore += 40;
          } else {
            prefScore -= 30;
          }
        }

        // Morning / Afternoon preference
        if (prefs.preferredTimeOfDay && prefs.preferredTimeOfDay !== 'ANY') {
          if (prefs.preferredTimeOfDay === 'MORNING' && isMorning) {
            prefScore += 35;
          } else if (prefs.preferredTimeOfDay === 'AFTERNOON' && !isMorning) {
            prefScore += 35;
          } else {
            // Did not match explicit preference: heavily penalize so gap optimization won't override it
            prefScore -= 100;
          }
        }

        // Target date preference
        if (prefs.preferredDate) {
          if (date === prefs.preferredDate) {
            prefScore += 50;
          } else {
            const diffDays = Math.abs(
              (new Date(date).getTime() - new Date(prefs.preferredDate).getTime()) / 86400000
            );
            prefScore -= diffDays * 15;
          }
        }

        const totalScore = prefScore + gapScore;

        let matchReason = '';
        if (isIsolatedGap) {
          matchReason = 'Optimiza agenda (cierra hueco)';
        } else if (prefs.preferredTimeOfDay && ((prefs.preferredTimeOfDay === 'MORNING' && isMorning) || (prefs.preferredTimeOfDay === 'AFTERNOON' && !isMorning))) {
          matchReason = `Preferencia: ${prefs.preferredTimeOfDay === 'MORNING' ? 'Mañana' : 'Tarde'}`;
        }

        const dateHuman = formatHumanDate(date);
        const timeHuman = formatTimeHs(slot.time);

        candidates.push({
          index: 0,
          date,
          time: slot.time,
          startIso: slot.startIso,
          endIso: slot.endIso,
          professionalId: 'prof_demo_1',
          human: `${dateHuman} a las ${timeHuman} hs`,
          score: totalScore,
          gapScore,
          isGapFilling: isIsolatedGap,
          matchReason,
        });
      });
    });

    // Sort descending by total score
    candidates.sort((a, b) => b.score - a.score);

    // Number candidates 1, 2, 3...
    candidates.forEach((c, idx) => {
      c.index = idx + 1;
    });

    const primarySlots = candidates.slice(0, limit);
    return {
      primarySlots,
      allSlots: candidates,
    };
  }
}
