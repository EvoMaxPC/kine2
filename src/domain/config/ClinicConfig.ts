import { DayScheduleConfig, WorkingInterval } from '../professionals/Professional.ts';
import { DataMode } from './DataMode.ts';
import { ReminderPolicy, DEFAULT_REMINDER_POLICY } from './ReminderPolicy.ts';

export type ScheduleExceptionType = 'CLOSED' | 'CUSTOM_HOURS';

export interface ScheduleException {
  id: string;
  professionalId?: string; // Si no se especifica o 'ALL', aplica a todo el consultorio
  startDate: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD opcional para rangos (ej. vacaciones)
  type: ScheduleExceptionType;
  reason: string; // "Feriado", "Vacaciones", "Capacitación", "Cierre extraordinario"
  intervals?: WorkingInterval[]; // Si type === 'CUSTOM_HOURS'
}

export interface ClinicConfig {
  clinicName: string; // "Consultorio Kinesiológico"
  professionalDisplayName: string; // "Lic. Martín Rodríguez"
  timezone: string; // "America/Argentina/Cordoba"
  defaultAppointmentDurationMinutes: number; // 45
  defaultSessionDurationMinutes: number; // 45 (compatibilidad)
  bufferBetweenAppointmentsMinutes: number; // 0
  workingDays: number[]; // 1 = Lunes, ..., 5 = Viernes
  workingHours: {
    start: string; // "08:00"
    end: string;   // "19:00"
  };
  workingSchedule: DayScheduleConfig[];
  lunchBreak?: {
    start: string; // "12:00"
    end: string;   // "15:00"
  };
  resourceSchedulingEnabled: boolean; // default false
  exceptions: ScheduleException[];
  reminderPolicy: ReminderPolicy;
  dataMode: DataMode; // default 'DEMO_PERSISTENT'
  isDemoMode: boolean; // true
  // Autonomous Secretary & Automation Engine settings (Prompt Maestro 04)
  requiresApprovalForNewAppointment: boolean; // Si es false, reserva automáticamente slots libres válidos
  conversationTimeoutMinutes: number; // Expiración de sesión conversacional (default 30 min)
  sequentialWaitlistOfferTimeoutMinutes: number; // Tiempo de espera para que candidato responda oferta (default 15 min)
  autonomousWaitlistMatching: boolean; // Activar búsqueda y oferta secuencial autónoma al liberarse un slot
  autonomousCancellationEnabled: boolean; // Permitir que la secretaria cancele turnos confirmados si el paciente lo solicita
  clinicAddress: string;
  clinicPhone: string;
  // Prompt Maestro 01 - KineTurnos Real Configuration Fields
  consultationFee: number; // Arancel de la sesión (ej: 15000)
  publicWhatsAppNumber: string; // Número WhatsApp público de contacto
  kinesiologistInternalPhone: string; // Número interno del kinesiólogo
  receptionPhone: string; // Número de recepción
  currentDelayMinutes: number; // Demora actual en consultorio
  approvalRules: {
    requireApprovalForNewAppointment: boolean; // Si true, todo turno solicitado pasa a PENDING_APPROVAL para decisión del kinesiólogo
    requireApprovalForCancellation: boolean;
    requireApprovalForRescheduling: boolean;
  };
}

export const DEFAULT_WORKING_INTERVALS: WorkingInterval[] = [
  { start: '08:00', end: '12:00' },
  { start: '15:00', end: '19:00' },
];

export const DEFAULT_WORKING_SCHEDULE: DayScheduleConfig[] = [
  {
    dayOfWeek: 1,
    dayName: 'Lunes',
    active: true,
    start: '08:00',
    end: '19:00',
    intervals: DEFAULT_WORKING_INTERVALS,
  },
  {
    dayOfWeek: 2,
    dayName: 'Martes',
    active: true,
    start: '08:00',
    end: '19:00',
    intervals: DEFAULT_WORKING_INTERVALS,
  },
  {
    dayOfWeek: 3,
    dayName: 'Miércoles',
    active: true,
    start: '08:00',
    end: '19:00',
    intervals: DEFAULT_WORKING_INTERVALS,
  },
  {
    dayOfWeek: 4,
    dayName: 'Jueves',
    active: true,
    start: '08:00',
    end: '19:00',
    intervals: DEFAULT_WORKING_INTERVALS,
  },
  {
    dayOfWeek: 5,
    dayName: 'Viernes',
    active: true,
    start: '08:00',
    end: '19:00',
    intervals: DEFAULT_WORKING_INTERVALS,
  },
  {
    dayOfWeek: 6,
    dayName: 'Sábado',
    active: false,
    start: '09:00',
    end: '13:00',
    intervals: [{ start: '09:00', end: '13:00' }],
  },
  {
    dayOfWeek: 0,
    dayName: 'Domingo',
    active: false,
    start: '09:00',
    end: '13:00',
    intervals: [],
  },
];

export const DEFAULT_CLINIC_CONFIG: ClinicConfig = {
  clinicName: 'Consultorio Kinesiológico',
  professionalDisplayName: 'Lic. Martín Rodríguez',
  timezone: 'America/Argentina/Cordoba',
  defaultAppointmentDurationMinutes: 45,
  defaultSessionDurationMinutes: 45,
  bufferBetweenAppointmentsMinutes: 0,
  workingDays: [1, 2, 3, 4, 5],
  workingHours: {
    start: '08:00',
    end: '19:00',
  },
  workingSchedule: DEFAULT_WORKING_SCHEDULE,
  lunchBreak: {
    start: '12:00',
    end: '15:00',
  },
  resourceSchedulingEnabled: false,
  exceptions: [],
  reminderPolicy: DEFAULT_REMINDER_POLICY,
  dataMode: 'DEMO_PERSISTENT',
  isDemoMode: true,
  requiresApprovalForNewAppointment: false,
  conversationTimeoutMinutes: 30,
  sequentialWaitlistOfferTimeoutMinutes: 15,
  autonomousWaitlistMatching: true,
  autonomousCancellationEnabled: true,
  clinicAddress: 'Av. Colón 1234, Piso 2, Consultorio B, Córdoba',
  clinicPhone: '+54 9 351 555-0199',
  consultationFee: 15000,
  publicWhatsAppNumber: '+1 737 221 2163',
  kinesiologistInternalPhone: '+54 9 343 622-4149',
  receptionPhone: '+54 9 343 622-4149',
  currentDelayMinutes: 0,
  approvalRules: {
    requireApprovalForNewAppointment: true, // Por defecto en circuito real: requiere decisión del profesional
    requireApprovalForCancellation: false,
    requireApprovalForRescheduling: true,
  },
};

/**
 * Calculates human status for the clinic today
 */
export function getClinicDailyStatus(
  config: ClinicConfig = DEFAULT_CLINIC_CONFIG,
  now: Date = new Date()
): { text: string; isOpen: boolean } {
  const day = now.getDay();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const dayConfig = config.workingSchedule?.find((d) => d.dayOfWeek === day);
  const isActiveDay = dayConfig ? dayConfig.active : config.workingDays.includes(day);

  if (!isActiveDay) {
    return { text: 'Cerrado hoy · Atención de lunes a viernes', isOpen: false };
  }

  // Si tiene intervals multi-franja
  if (dayConfig && dayConfig.intervals && dayConfig.intervals.length > 0) {
    for (const intv of dayConfig.intervals) {
      const [sh, sm] = intv.start.split(':').map(Number);
      const [eh, em] = intv.end.split(':').map(Number);
      const sMin = sh * 60 + sm;
      const eMin = eh * 60 + em;
      if (currentMinutes >= sMin && currentMinutes < eMin) {
        return { text: `Atendiendo hasta las ${intv.end} hs`, isOpen: true };
      }
    }
    // Si estamos antes de la primera franja
    const [firstH, firstM] = dayConfig.intervals[0].start.split(':').map(Number);
    if (currentMinutes < firstH * 60 + firstM) {
      return { text: `Apertura a las ${dayConfig.intervals[0].start} hs`, isOpen: false };
    }
    // Si estamos en el receso del mediodía
    if (dayConfig.intervals.length > 1) {
      const [i1EndH, i1EndM] = dayConfig.intervals[0].end.split(':').map(Number);
      const [i2StartH, i2StartM] = dayConfig.intervals[1].start.split(':').map(Number);
      if (currentMinutes >= i1EndH * 60 + i1EndM && currentMinutes < i2StartH * 60 + i2StartM) {
        return { text: `Receso · Reanuda a las ${dayConfig.intervals[1].start} hs`, isOpen: false };
      }
    }
    return { text: 'Jornada finalizada', isOpen: false };
  }

  const startStr = dayConfig?.start || config.workingHours.start;
  const endStr = dayConfig?.end || config.workingHours.end;

  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);

  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;

  if (currentMinutes < startMin) {
    return { text: `Apertura a las ${startStr} hs`, isOpen: false };
  } else if (currentMinutes >= endMin) {
    return { text: 'Jornada finalizada', isOpen: false };
  } else {
    return { text: `Atendiendo hasta las ${endStr} hs`, isOpen: true };
  }
}
