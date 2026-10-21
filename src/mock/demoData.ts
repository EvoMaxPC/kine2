import {
  Professional,
  Patient,
  Appointment,
  AppointmentStatus,
  AppointmentType,
  Resource,
  WaitlistEntry,
  AppointmentRequest,
  RequestType,
  RequestStatus,
  AuditEvent,
  ConversationMessage,
} from '../types/index.ts';
import { getTodayDateString, addDays, buildIsoDateTime } from '../utils/dateUtils.ts';

const today = getTodayDateString();
const tomorrow = addDays(today, 1);
const dayAfter = addDays(today, 2);
const dayFour = addDays(today, 3);

export const DEMO_PROFESSIONALS: Professional[] = [
  {
    id: 'prof_demo_1',
    firstName: 'Martín',
    lastName: 'Rodríguez',
    displayName: 'Lic. Martín Rodríguez',
    specialty: 'Kinesiología & Fisiatría General',
    active: true,
    displayColor: '#0D9488', // Teal
    defaultDurationMinutes: 45,
  },
  {
    id: 'prof_demo_2',
    firstName: 'Lucía',
    lastName: 'Gómez',
    displayName: 'Lic. Lucía Gómez',
    specialty: 'Rehabilitación Traumatológica',
    active: true,
    displayColor: '#4F46E5', // Indigo
    defaultDurationMinutes: 45,
  },
];

export const DEMO_APPOINTMENT_TYPES: AppointmentType[] = [
  {
    id: 'apt_type_standard',
    name: 'Sesión estándar',
    durationMinutes: 45,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    active: true,
    displayColor: '#0D9488',
    description: 'Sesión de kinesiología y rehabilitación habitual',
  },
  {
    id: 'apt_type_evaluation',
    name: 'Evaluación inicial',
    durationMinutes: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    active: true,
    displayColor: '#4F46E5',
    description: 'Primera consulta kinesiológica y apertura de ficha administrativa',
  },
  {
    id: 'apt_type_short',
    name: 'Control / Sesión breve',
    durationMinutes: 30,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    active: true,
    displayColor: '#059669',
    description: 'Control de rutina o aplicación puntual',
  },
];

export const DEMO_RESOURCES: Resource[] = [
  { id: 'res_box_1', name: 'Box 1', type: 'BOX', active: true },
  { id: 'res_box_2', name: 'Box 2', type: 'BOX', active: true },
  { id: 'res_gym', name: 'Gimnasio de Rehabilitación', type: 'SALA_GIMNASIO', active: true },
];

/**
 * Pacientes DEMO con información estrictamente ADMINISTRATIVA.
 * No contiene diagnósticos médicos, patologías ni evoluciones clínicas.
 */
export const DEMO_PATIENTS: Patient[] = [
  {
    id: 'pat_demo_1',
    firstName: 'María',
    lastName: 'Fernández',
    phone: '+54 9 11 5555-1111',
    whatsappPhone: '+54 9 11 5555-1111',
    email: 'maria.fernandez@ejemplo.com',
    insurance: 'OSDE 310',
    insuranceNumber: '89230192-01',
    administrativeNotes: 'Presentó derivación médica autorizada. Prefiere turno por la mañana.',
    active: true,
    createdAt: addDays(today, -30),
  },
  {
    id: 'pat_demo_2',
    firstName: 'Juan Ignacio',
    lastName: 'Pérez',
    phone: '+54 9 11 5555-2222',
    whatsappPhone: '+54 9 11 5555-2222',
    email: 'juan.perez@ejemplo.com',
    insurance: 'Swiss Medical',
    insuranceNumber: '44102930-00',
    administrativeNotes: 'Plan corporativo. Notificar con 24 hs de anticipación.',
    active: true,
    createdAt: addDays(today, -20),
  },
  {
    id: 'pat_demo_3',
    firstName: 'Laura',
    lastName: 'González',
    phone: '+54 9 11 5555-3333',
    whatsappPhone: '+54 9 11 5555-3333',
    email: 'laura.gonzalez@ejemplo.com',
    insurance: 'Particular',
    administrativeNotes: 'Abona mediante transferencia bancaria al ingresar.',
    active: true,
    createdAt: addDays(today, -15),
  },
  {
    id: 'pat_demo_4',
    firstName: 'Carlos',
    lastName: 'Benítez',
    phone: '+54 9 11 5555-4444',
    whatsappPhone: '+54 9 11 5555-4444',
    email: 'carlos.benitez@ejemplo.com',
    insurance: 'Galeno 220',
    insuranceNumber: '55610293-02',
    administrativeNotes: 'Autorización digital requerida por sesión.',
    active: true,
    createdAt: addDays(today, -10),
  },
  {
    id: 'pat_demo_5',
    firstName: 'Valentina',
    lastName: 'Rivas',
    phone: '+54 9 11 5555-5555',
    whatsappPhone: '+54 9 11 5555-5555',
    email: 'valen.rivas@ejemplo.com',
    insurance: 'Particular',
    administrativeNotes: 'Solicitó serie de turnos martes y jueves.',
    active: true,
    createdAt: addDays(today, -5),
  },
];

export const DEMO_WAITLIST_ENTRIES: WaitlistEntry[] = [
  {
    id: 'wl_demo_1',
    patientId: 'pat_demo_5',
    professionalId: 'prof_demo_1',
    appointmentTypeId: 'apt_type_standard',
    preferredDays: [1, 3, 5], // Lun, Mie, Vie
    preferredTimeRanges: [
      { start: '16:00', end: '19:00' },
    ],
    priority: 'HIGH',
    status: 'ACTIVE',
    createdAt: addDays(today, -2),
    notes: 'Necesita turno por la tarde apenas se desocupe un espacio',
  },
  {
    id: 'wl_demo_2',
    patientId: 'pat_demo_3',
    professionalId: 'prof_demo_1',
    appointmentTypeId: 'apt_type_standard',
    preferredDays: [2, 4], // Mar, Jue
    preferredTimeRanges: [
      { start: '09:00', end: '12:00' },
    ],
    priority: 'NORMAL',
    status: 'ACTIVE',
    createdAt: addDays(today, -1),
    notes: 'Disponible por la mañana',
  },
];

export const DEMO_INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt_demo_today_1',
    patientId: 'pat_demo_1',
    professionalId: 'prof_demo_1',
    appointmentTypeId: 'apt_type_standard',
    resourceId: 'res_box_1',
    seriesIndex: 6,
    seriesTotal: 10,
    startAt: buildIsoDateTime(today, '09:00'),
    endAt: buildIsoDateTime(today, '09:45'),
    durationMinutes: 45,
    status: AppointmentStatus.CONFIRMED,
    source: 'WHATSAPP_AI',
    confirmationStatus: 'CONFIRMED',
    // Paciente que ya llegó a la sala de espera para probar digital waiting room
    arrivedAt: buildIsoDateTime(today, '08:52'),
    administrativeNotes: 'Orden médica entregada en recepción',
    createdAt: addDays(today, -7),
    updatedAt: addDays(today, -7),
  },
  {
    id: 'apt_demo_today_2',
    patientId: 'pat_demo_2',
    professionalId: 'prof_demo_1',
    appointmentTypeId: 'apt_type_standard',
    resourceId: 'res_box_2',
    seriesIndex: 3,
    seriesTotal: 8,
    startAt: buildIsoDateTime(today, '10:00'),
    endAt: buildIsoDateTime(today, '10:45'),
    durationMinutes: 45,
    status: AppointmentStatus.CONFIRMED,
    source: 'WHATSAPP_AI',
    confirmationStatus: 'CONFIRMED',
    administrativeNotes: 'Abonado por prepaga',
    createdAt: addDays(today, -5),
    updatedAt: addDays(today, -5),
  },
  {
    id: 'apt_demo_today_3',
    patientId: 'pat_demo_3',
    professionalId: 'prof_demo_1',
    appointmentTypeId: 'apt_type_evaluation',
    resourceId: 'res_box_1',
    seriesIndex: 1,
    seriesTotal: 1,
    startAt: buildIsoDateTime(today, '11:00'),
    endAt: buildIsoDateTime(today, '12:00'),
    durationMinutes: 60,
    status: AppointmentStatus.CONFIRMED,
    source: 'MANUAL_STAFF',
    confirmationStatus: 'PENDING',
    administrativeNotes: 'Primera vez en el consultorio',
    createdAt: addDays(today, -2),
    updatedAt: addDays(today, -2),
  },
  {
    id: 'apt_demo_today_4',
    patientId: 'pat_demo_4',
    professionalId: 'prof_demo_1',
    appointmentTypeId: 'apt_type_standard',
    resourceId: 'res_gym',
    seriesIndex: 4,
    seriesTotal: 6,
    startAt: buildIsoDateTime(today, '16:00'),
    endAt: buildIsoDateTime(today, '16:45'),
    durationMinutes: 45,
    status: AppointmentStatus.CONFIRMED,
    source: 'WHATSAPP_AI',
    confirmationStatus: 'CONFIRMED',
    administrativeNotes: 'Requiere factura B',
    createdAt: addDays(today, -4),
    updatedAt: addDays(today, -4),
  },
  // Turno para Profesional DEMO 2 el mismo día para probar agenda multiprofesional
  {
    id: 'apt_demo_prof2_1',
    patientId: 'pat_demo_5',
    professionalId: 'prof_demo_2',
    appointmentTypeId: 'apt_type_standard',
    resourceId: 'res_box_2',
    startAt: buildIsoDateTime(today, '10:00'),
    endAt: buildIsoDateTime(today, '10:45'),
    durationMinutes: 45,
    status: AppointmentStatus.CONFIRMED,
    source: 'MANUAL_STAFF',
    confirmationStatus: 'CONFIRMED',
    administrativeNotes: 'Atención con Profesional 2',
    createdAt: addDays(today, -3),
    updatedAt: addDays(today, -3),
  },
  // Turno mañana
  {
    id: 'apt_demo_tom_1',
    patientId: 'pat_demo_1',
    professionalId: 'prof_demo_1',
    appointmentTypeId: 'apt_type_standard',
    startAt: buildIsoDateTime(tomorrow, '10:00'),
    endAt: buildIsoDateTime(tomorrow, '10:45'),
    durationMinutes: 45,
    status: AppointmentStatus.CONFIRMED,
    source: 'WHATSAPP_AI',
    confirmationStatus: 'PENDING',
    createdAt: addDays(today, -2),
    updatedAt: addDays(today, -2),
  },
  {
    id: 'apt_demo_tom_2',
    patientId: 'pat_demo_4',
    professionalId: 'prof_demo_1',
    appointmentTypeId: 'apt_type_standard',
    startAt: buildIsoDateTime(tomorrow, '11:15'),
    endAt: buildIsoDateTime(tomorrow, '12:00'),
    durationMinutes: 45,
    status: AppointmentStatus.CONFIRMED,
    source: 'WHATSAPP_AI',
    confirmationStatus: 'CONFIRMED',
    createdAt: addDays(today, -2),
    updatedAt: addDays(today, -2),
  },
];

export const DEMO_REQUESTS: AppointmentRequest[] = [
  {
    id: 'req_demo_1',
    patientId: 'pat_demo_5',
    professionalId: 'prof_demo_1',
    type: RequestType.CREATE,
    status: RequestStatus.PENDING,
    requestedStartAt: buildIsoDateTime(dayAfter, '16:00'),
    requestedEndAt: buildIsoDateTime(dayAfter, '16:45'),
    patientMessage: 'Quería consultar para sacar un turno de kinesiología esta semana por la tarde a partir de las 16 hs',
    createdAt: buildIsoDateTime(today, '08:30'),
  },
  {
    id: 'req_demo_2',
    patientId: 'pat_demo_2',
    professionalId: 'prof_demo_1',
    type: RequestType.CHANGE,
    status: RequestStatus.PENDING,
    currentAppointmentId: 'apt_demo_today_2',
    requestedStartAt: buildIsoDateTime(dayFour, '11:00'),
    requestedEndAt: buildIsoDateTime(dayFour, '11:45'),
    patientMessage: 'Complicación con el turno de hoy a las 10 hs. ¿Podría pasarlo al jueves a las 11:00 hs?',
    createdAt: buildIsoDateTime(today, '08:45'),
  },
];

export const DEMO_AUDIT_LOGS: AuditEvent[] = [
  {
    id: 'audit_demo_1',
    timestamp: buildIsoDateTime(today, '08:30'),
    actorType: 'AI_ASSISTANT',
    action: 'REQUEST_RECEIVED',
    entityType: 'REQUEST',
    entityId: 'req_demo_1',
    description: 'Solicitud recibida por WhatsApp desde el teléfono +54 9 11 5555-5555',
  },
  {
    id: 'audit_demo_2',
    timestamp: buildIsoDateTime(today, '08:45'),
    actorType: 'AI_ASSISTANT',
    action: 'RESCHEDULE_REQUESTED',
    entityType: 'REQUEST',
    entityId: 'req_demo_2',
    description: 'Juan Ignacio Pérez solicitó reprogramar turno de hoy 10:00 hs',
  },
  {
    id: 'audit_demo_3',
    timestamp: buildIsoDateTime(today, '08:52'),
    actorType: 'STAFF',
    action: 'PATIENT_ARRIVED',
    entityType: 'APPOINTMENT',
    entityId: 'apt_demo_today_1',
    description: 'Recepción registró la llegada de María Fernández a la sala de espera',
  },
];

export const DEMO_CONVERSATIONS: ConversationMessage[] = [
  {
    id: 'msg_demo_1',
    patientId: 'pat_demo_5',
    direction: 'INBOUND',
    messageType: 'TEXT',
    status: 'DELIVERED',
    content: 'Hola, buenas tardes. Quería consultar para sacar un turno de kinesiología esta semana por la tarde.',
    timestamp: buildIsoDateTime(today, '08:25'),
  },
  {
    id: 'msg_demo_2',
    patientId: 'pat_demo_5',
    direction: 'OUTBOUND',
    messageType: 'TEXT',
    status: 'DELIVERED',
    content: '¡Hola Valentina! Te saluda el asistente digital de Consultorio Kinesiológico. Tenemos disponibilidad para el miércoles a las 16:00 hs. ¿Te queda cómodo?',
    timestamp: buildIsoDateTime(today, '08:26'),
  },
  {
    id: 'msg_demo_3',
    patientId: 'pat_demo_5',
    direction: 'INBOUND',
    messageType: 'TEXT',
    status: 'DELIVERED',
    content: 'Sí, perfecto, me queda impecable a esa hora.',
    timestamp: buildIsoDateTime(today, '08:29'),
  },
  {
    id: 'msg_demo_4',
    patientId: 'pat_demo_5',
    direction: 'OUTBOUND',
    messageType: 'TEXT',
    status: 'PREPARED_FOR_WHATSAPP',
    content: '¡Excelente! Ya dejamos registrada la solicitud para el miércoles a las 16:00 hs con el Lic. Martín Rodríguez. Apenas sea confirmada te avisamos por acá.',
    timestamp: buildIsoDateTime(today, '08:30'),
  },
];

// Compatibilidad con repositorios existentes
export const DEMO_INITIAL_REQUESTS = DEMO_REQUESTS;
export const DEMO_INITIAL_AUDIT = DEMO_AUDIT_LOGS;
export const DEMO_INITIAL_MESSAGES = DEMO_CONVERSATIONS;

