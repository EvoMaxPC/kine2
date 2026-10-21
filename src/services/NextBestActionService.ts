/**
 * @file NextBestActionService.ts
 * @description Determina la siguiente mejor acción operativa recomendada (Next Best Action) en un único bloque focalizado.
 */

import { TodayOverviewSummary, WaitingRoomPatient } from './AppointmentService.ts';
import { DecisionItem, WaitlistEntry, AppointmentStatus } from '../types/index.ts';

export interface NextBestAction {
  id: string;
  badge: string;
  priority: 'CRITICAL' | 'HIGH' | 'NORMAL';
  title: string;
  description: string;
  actionButtonText: string;
  actionType: 'START_SESSION' | 'SEND_REMINDERS' | 'DECISION_CENTER' | 'WAITLIST_OFFER' | 'CLINIC_DELAY';
  payload?: any;
}

export class NextBestActionService {
  static evaluateNextAction(
    overview: TodayOverviewSummary | null | undefined,
    pendingDecisions: DecisionItem[] = [],
    activeWaitlist: WaitlistEntry[] = []
  ): NextBestAction | null {
    if (!overview) return null;

    try {
      const waitingRoom = Array.isArray(overview.waitingRoom) ? overview.waitingRoom : [];
      const appointments = Array.isArray(overview.appointments) ? overview.appointments : [];
      const safeDecisions = Array.isArray(pendingDecisions) ? pendingDecisions : [];
      const safeWaitlist = Array.isArray(activeWaitlist) ? activeWaitlist : [];

      // 1. CRITICAL: Paciente esperando en sala de espera hace más de 15 minutos
      const longWaiting = waitingRoom.find((w) => w && !w.isBeingAttended && (w.waitingMinutes || 0) >= 15);
      if (longWaiting && longWaiting.patient && longWaiting.appointment) {
        const pName = `${longWaiting.patient.firstName || 'Paciente'} ${longWaiting.patient.lastName || ''}`.trim();
        return {
          id: 'nba_waiting_overdue',
          badge: 'Atención Demorada',
          priority: 'CRITICAL',
          title: `${pName} lleva ${longWaiting.waitingMinutes} min esperando`,
          description: 'El paciente ya se encuentra en sala de espera listo para ingresar al box.',
          actionButtonText: 'Iniciar Sesión Ahora',
          actionType: 'START_SESSION',
          payload: { appointmentId: longWaiting.appointment.id },
        };
      }

      // 2. HIGH: Hay decisiones críticas pendientes en el Centro de Decisiones
      const urgentDecision = safeDecisions.find(
        (d) => d && d.status === 'PENDING' && (d.priority === 'CRITICAL' || d.priority === 'HIGH' || d.severity === 'urgent')
      );
      if (urgentDecision) {
        return {
          id: 'nba_decision_urgent',
          badge: 'Centro de Decisiones',
          priority: 'HIGH',
          title: urgentDecision.title || 'Decisión pendiente',
          description: urgentDecision.whatHappened || urgentDecision.description || 'Requiere revisión profesional.',
          actionButtonText: 'Revisar en Centro de Decisiones',
          actionType: 'DECISION_CENTER',
          payload: { decisionId: urgentDecision.id },
        };
      }

      // 3. HIGH: Turnos de hoy sin confirmar
      const unconfirmedToday = appointments.filter(
        (a) => a && a.status === AppointmentStatus.CONFIRMED && a.confirmationStatus !== 'CONFIRMED' && !a.reminderSentAt
      );
      if (unconfirmedToday.length > 0) {
        return {
          id: 'nba_reminders_needed',
          badge: 'Recordatorios Pendientes',
          priority: 'HIGH',
          title: `Hay ${unconfirmedToday.length} turno${unconfirmedToday.length === 1 ? '' : 's'} de hoy sin confirmar`,
          description: 'La secretaria puede despachar recordatorio por WhatsApp con botón de confirmación automática.',
          actionButtonText: 'Enviar Recordatorios',
          actionType: 'SEND_REMINDERS',
        };
      }

      // 4. NORMAL: Slot libre hoy con candidatos en lista de espera
      const freeSlots = overview.freeSlotsCount ?? 0;
      if (freeSlots > 0 && safeWaitlist.length > 0) {
        return {
          id: 'nba_waitlist_slots',
          badge: 'Lista de Espera Activa',
          priority: 'NORMAL',
          title: `Tenés ${freeSlots} horario${freeSlots === 1 ? '' : 's'} libre${freeSlots === 1 ? '' : 's'} y ${safeWaitlist.length} en espera`,
          description: 'Podés ofertar el hueco a pacientes compatibles para maximizar la ocupación del consultorio.',
          actionButtonText: 'Asignar Lista de Espera',
          actionType: 'WAITLIST_OFFER',
        };
      }

      // 5. Default: Próximo paciente a atender si está en sala
      const firstInWaiting = waitingRoom.find((w) => w && !w.isBeingAttended);
      if (firstInWaiting && firstInWaiting.patient && firstInWaiting.appointment) {
        const pName = `${firstInWaiting.patient.firstName || 'Paciente'} ${firstInWaiting.patient.lastName || ''}`.trim();
        const startHs = firstInWaiting.appointment.startAt && typeof firstInWaiting.appointment.startAt === 'string'
          ? firstInWaiting.appointment.startAt.split('T')[1]?.substring(0, 5) || ''
          : '';
        return {
          id: 'nba_waiting_room',
          badge: 'En Recepción',
          priority: 'NORMAL',
          title: `${pName} llegó a recepción`,
          description: startHs ? `Turno agendado a las ${startHs} hs.` : 'Listo para ingresar al box.',
          actionButtonText: 'Llamar al Box',
          actionType: 'START_SESSION',
          payload: { appointmentId: firstInWaiting.appointment.id },
        };
      }
    } catch (e) {
      console.warn('NextBestActionService: error evaluating next action:', e);
    }

    return null;
  }
}
