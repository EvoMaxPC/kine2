/**
 * @file DailyClosingSummaryService.ts
 * @description Generador del balance y cierre operativo al final del día para el consultorio kinesiológico.
 */

import { Appointment, AppointmentStatus, AppointmentRequest, WaitlistEntry } from '../types/index.ts';

export interface DailyClosingSummary {
  dateString: string;
  attendedCount: number; // Atendidos (COMPLETED)
  absentCount: number; // Ausentes (NO_SHOW)
  cancelledCount: number; // Cancelados (CANCELLED)
  rescheduledCount: number; // Reprogramados
  recoveredSlotsCount: number; // Turnos recuperados por lista de espera
  estimatedEconomicValueRecovered: number; // e.g. $14.000 x slots recuperados
  pendingRequestsForTomorrow: number; // Solicitudes pendientes para mañana
  occupancyPercentage: number;
}

export class DailyClosingSummaryService {
  static generateClosingSummary(
    dateString: string,
    appointments: Appointment[],
    allRequests: AppointmentRequest[] = [],
    recoveredCount: number = 1,
    averageSessionPrice: number = 14000
  ): DailyClosingSummary {
    const todayApps = appointments;

    const attendedCount = todayApps.filter((a) => a.status === AppointmentStatus.COMPLETED).length;
    const absentCount = todayApps.filter((a) => a.status === AppointmentStatus.NO_SHOW).length;
    const cancelledCount = todayApps.filter((a) => a.status === AppointmentStatus.CANCELLED).length;
    const rescheduledCount = todayApps.filter((a) => !!a.previousStartAt).length;

    const totalActiveOrFinished = attendedCount + absentCount + todayApps.filter(
      (a) => a.status === AppointmentStatus.CONFIRMED
    ).length;
    const totalPotential = todayApps.length || 1;
    const occupancyPercentage = Math.round((totalActiveOrFinished / totalPotential) * 100);

    const pendingRequestsForTomorrow = allRequests.filter(
      (r) => r.status === 'PENDING'
    ).length;

    return {
      dateString,
      attendedCount,
      absentCount,
      cancelledCount,
      rescheduledCount,
      recoveredSlotsCount: recoveredCount,
      estimatedEconomicValueRecovered: recoveredCount * averageSessionPrice,
      pendingRequestsForTomorrow,
      occupancyPercentage: Math.min(100, occupancyPercentage),
    };
  }
}
