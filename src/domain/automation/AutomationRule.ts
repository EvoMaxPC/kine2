import { AutomationEventType } from './AutomationEventType.ts';
import { AutomationLevel } from './AutomationLevel.ts';
import { AutomationEvent } from './AutomationEvent.ts';

export interface AutomationActionResult {
  success: boolean;
  actionTaken: string;
  message?: string;
  data?: any;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  eventType: AutomationEventType;
  level: AutomationLevel;
  enabled: boolean;
  priority: number;
  conditionsDescription: string;
  actionsDescription: string;
  conditions?: (event: AutomationEvent, context?: any) => Promise<boolean> | boolean;
  execute?: (event: AutomationEvent, context?: any) => Promise<AutomationActionResult>;
}

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: 'rule_waitlist_autoheal',
    name: 'Auto-relleno por Cancelación (Waitlist)',
    description: 'Al liberarse o cancelarse un turno, busca candidatos compatibles en Lista de Espera y genera oferta inmediata.',
    eventType: AutomationEventType.APPOINTMENT_CANCELLED,
    level: 'AUTO',
    enabled: true,
    priority: 100,
    conditionsDescription: 'Existen pacientes activos en Lista de Espera con preferencias compatibles.',
    actionsDescription: 'Genera SlotOffer con caducidad (30 min) y prepara notificación por WhatsApp al paciente prioritario.',
  },
  {
    id: 'rule_slot_released_autoheal',
    name: 'Auto-relleno de Hueco por Reprogramación',
    description: 'Cuando un turno es reprogramado a otra fecha, el slot liberado se ofrece inmediatamente a la lista de espera.',
    eventType: AutomationEventType.SLOT_RELEASED,
    level: 'AUTO',
    enabled: true,
    priority: 95,
    conditionsDescription: 'El slot liberado tiene al menos 3 horas de antelación y hay candidatos en espera.',
    actionsDescription: 'Genera SlotOffer y envía propuesta al primer paciente compatible de la lista de espera.',
  },
  {
    id: 'rule_waitlist_offer_expired',
    name: 'Reintento Automático de Oferta Vencida',
    description: 'Si una oferta a lista de espera vence o es rechazada, pasa automáticamente al siguiente candidato en lista.',
    eventType: AutomationEventType.SLOT_OFFER_EXPIRED,
    level: 'AUTO',
    enabled: true,
    priority: 90,
    conditionsDescription: 'La oferta expiró sin respuesta y el slot continúa disponible.',
    actionsDescription: 'Marca la oferta como EXPIRED y emite una nueva oferta al siguiente paciente elegible.',
  },
  {
    id: 'rule_patient_reminders',
    name: 'Envío de Recordatorios Preventivos',
    description: 'Emite recordatorios a los pacientes del día siguiente con botones rápidos de confirmación o cancelación.',
    eventType: AutomationEventType.REMINDER_DUE,
    level: 'AUTO',
    enabled: true,
    priority: 80,
    conditionsDescription: 'Turno en estado REQUESTED o PENDING_APPROVAL que no ha sido confirmado aún.',
    actionsDescription: 'Envía mensaje interactivo por WhatsApp solicitando confirmación.',
  },
  {
    id: 'rule_process_confirmation',
    name: 'Procesamiento de Respuesta al Recordatorio',
    description: 'Si el paciente responde confirmando, valida el turno; si rechaza o avisa que no asiste, cancela y libera el slot.',
    eventType: AutomationEventType.PATIENT_CONFIRMATION_RECEIVED,
    level: 'AUTO',
    enabled: true,
    priority: 85,
    conditionsDescription: 'Respuesta válida del paciente con intención afirmativa o negativa clara.',
    actionsDescription: 'Actualiza el turno y si cancela, emite APPOINTMENT_CANCELLED disparando el auto-relleno.',
  },
  {
    id: 'rule_delay_notifications',
    name: 'Aviso Proactivo por Demora en Consultorio',
    description: 'Al registrarse demora en la atención, avisa automáticamente a los turnos siguientes para evitar esperas en sala.',
    eventType: AutomationEventType.CLINIC_DELAY_CHANGED,
    level: 'AUTO',
    enabled: true,
    priority: 75,
    conditionsDescription: 'Demora registrada mayor o igual a 15 minutos en el consultorio.',
    actionsDescription: 'Redacta y prepara mensajes empáticos por WhatsApp a los pacientes afectados con el nuevo horario estimado.',
  },
  {
    id: 'rule_overdue_alerts',
    name: 'Alerta de Paciente con Turno en Demora',
    description: 'Si pasaron 15 minutos de la hora del turno y el paciente no llegó a sala de espera, genera alerta operativa.',
    eventType: AutomationEventType.APPOINTMENT_OVERDUE,
    level: 'ASK_PROFESSIONAL',
    enabled: true,
    priority: 60,
    conditionsDescription: 'Turno confirmado cuya hora de inicio expiró hace más de 15 minutos sin check-in en sala.',
    actionsDescription: 'Crea item en el Decision Center para decidir: Marcar Ausente (No-show), Contactar por WhatsApp o Esperar.',
  },
  {
    id: 'rule_secretary_inbound',
    name: 'Secretaria Digital Autónoma (WhatsApp)',
    description: 'Procesa mensajes entrantes, deduce intenciones, consulta agenda real y resuelve de manera autónoma.',
    eventType: AutomationEventType.PATIENT_MESSAGE_RECEIVED,
    level: 'AUTO',
    enabled: true,
    priority: 110,
    conditionsDescription: 'Mensaje entrante de WhatsApp recibido por el webhook simulado.',
    actionsDescription: 'Ejecuta SecretaryOrchestrator, aplica políticas de atención y si hay ambigüedad deriva al Decision Center.',
  },
];
