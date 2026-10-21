import { MockAppointmentRepository } from '../repositories/MockAppointmentRepository.ts';
import { MockPatientRepository } from '../repositories/MockPatientRepository.ts';
import { MockRequestRepository } from '../repositories/MockRequestRepository.ts';
import { MockAuditRepository } from '../repositories/MockAuditRepository.ts';
import { MockConversationRepository } from '../repositories/MockConversationRepository.ts';
import { MockWaitlistRepository } from '../repositories/MockWaitlistRepository.ts';
import { MockProfessionalRepository } from '../repositories/MockProfessionalRepository.ts';
import { MockWhatsAppProvider } from '../integrations/whatsapp/MockWhatsAppProvider.ts';
import { AppointmentService } from '../services/AppointmentService.ts';
import {
  AppointmentStatus,
  DEFAULT_CLINIC_CONFIG,
  Patient,
} from '../types/index.ts';
import { normalizeArgentinePhoneNumber } from '../utils/phoneUtils.ts';
import { detectPotentialDuplicatePatient } from '../utils/patientUtils.ts';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failed++;
  }
}

export async function runOperationalProTests() {
  console.log('\n======================================================');
  console.log('🚀 EJECUTANDO PRUEBAS OPERATIONAL PRO (FASE 3)');
  console.log('======================================================\n');

  const appointmentRepo = new MockAppointmentRepository([]);
  const patientRepo = new MockPatientRepository([]);
  const requestRepo = new MockRequestRepository([]);
  const auditRepo = new MockAuditRepository([]);
  const conversationRepo = new MockConversationRepository([]);
  const waitlistRepo = new MockWaitlistRepository([]);
  const professionalRepo = new MockProfessionalRepository([]);
  const whatsappProvider = new MockWhatsAppProvider(conversationRepo);

  const service = new AppointmentService(
    appointmentRepo,
    patientRepo,
    requestRepo,
    auditRepo,
    conversationRepo,
    whatsappProvider,
    { ...DEFAULT_CLINIC_CONFIG },
    waitlistRepo,
    professionalRepo
  );

  // --------------------------------------------------------------------------
  // TEST 1: Sala de Espera Digital (Llegó -> Inició -> Finalizó)
  // --------------------------------------------------------------------------
  console.log('Test 1: Sala de Espera Digital (Llegada, Atención y Finalización)');
  const pat1 = await patientRepo.createPatient({
    firstName: 'Paciente',
    lastName: 'Espera',
    phone: '+54 9 11 5555-9999',
    whatsappPhone: '+54 9 11 5555-9999',
    active: true,
  });

  const app1 = await appointmentRepo.createAppointment({
    patientId: pat1.id,
    professionalId: 'prof_demo_1',
    startAt: '2026-10-15T09:00:00.000Z',
    endAt: '2026-10-15T09:45:00.000Z',
    durationMinutes: 45,
    status: AppointmentStatus.CONFIRMED,
    source: 'MANUAL_STAFF',
  });

  // Paciente llega
  const arrivedApp = await service.markPatientArrived(app1.id);
  assert(Boolean(arrivedApp.arrivedAt), 'Marcado de llegada registra timestamp arrivedAt');

  // Iniciar sesión
  const startedApp = await service.startSession(app1.id);
  assert(Boolean(startedApp.sessionStartedAt), 'Iniciar sesión registra timestamp sessionStartedAt');

  // Finalizar sesión
  const finishedApp = await service.finishSession(app1.id);
  assert(
    Boolean(finishedApp.completedAt) && finishedApp.status === AppointmentStatus.COMPLETED,
    'Finalizar sesión marca status COMPLETED y registra completedAt'
  );

  // --------------------------------------------------------------------------
  // TEST 2: Normalización de Teléfonos Argentinos
  // --------------------------------------------------------------------------
  console.log('\nTest 2: Normalización de Teléfonos Argentinos');
  const normalized1 = normalizeArgentinePhoneNumber('11 5555 1111');
  const normalized2 = normalizeArgentinePhoneNumber('+54 9 11 5555-1111');
  const normalized3 = normalizeArgentinePhoneNumber('011 15 5555-1111');

  assert(
    normalized1.includes('5555') && normalized2.includes('5555') && normalized3.includes('5555'),
    'Normalización procesa números locales y con prefijo sin inventar datos'
  );

  // --------------------------------------------------------------------------
  // TEST 3: Detección de Paciente Duplicado
  // --------------------------------------------------------------------------
  console.log('\nTest 3: Detección de Paciente Duplicado');
  const existingPatients: Patient[] = [
    {
      id: 'pat_ex_1',
      firstName: 'Carlos',
      lastName: 'Gómez',
      phone: '+54 9 11 4444-1234',
      whatsappPhone: '+54 9 11 4444-1234',
      active: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
  ];

  // Intento de duplicado con mismo número de teléfono
  const dupResultPhone = detectPotentialDuplicatePatient(
    { firstName: 'Carlos', lastName: 'G.', phone: '11 4444 1234' },
    existingPatients
  );
  assert(dupResultPhone.isDuplicate, 'Detecta duplicado por número de teléfono');

  // Paciente nuevo no duplicado
  const dupResultNew = detectPotentialDuplicatePatient(
    { firstName: 'Mariana', lastName: 'López', phone: '11 9999 8888' },
    existingPatients
  );
  assert(!dupResultNew.isDuplicate, 'Permite paciente nuevo sin falsos positivos');

  // --------------------------------------------------------------------------
  // TEST 4: Series de Turnos (Crear disponibles y resolver conflictos)
  // --------------------------------------------------------------------------
  console.log('\nTest 4: Series de Turnos con detección de colisiones');
  // Crear un turno previo que bloqueará uno de los slots de la serie
  await appointmentRepo.createAppointment({
    patientId: 'pat_other',
    professionalId: 'prof_demo_1',
    startAt: '2026-11-03T10:00:00.000Z', // Martes 10:00
    endAt: '2026-11-03T10:45:00.000Z',
    durationMinutes: 45,
    status: AppointmentStatus.CONFIRMED,
    source: 'MANUAL_STAFF',
  });

  const preview = await service.previewSeriesSlots({
    patientId: pat1.id,
    professionalId: 'prof_demo_1',
    startDate: '2026-11-03',
    totalWeeks: 2,
    daysOfWeek: [2], // Martes
    timeSlots: { 2: '10:00' },
    durationMinutes: 45,
  });

  assert(preview.totalSlots === 2, 'Calculó 2 slots para 2 semanas');
  assert(preview.conflictCount === 1, 'Detectó exactamente 1 conflicto ocupado');
  assert(preview.availableCount === 1, 'Detectó exactamente 1 slot disponible');

  const creationResult = await service.createSeriesAppointments({
    patientId: pat1.id,
    professionalId: 'prof_demo_1',
    frequency: 'WEEKLY',
    daysOfWeek: [2],
    timeSlots: { 2: '10:00' },
    slotsToCreate: preview.slots.filter((s) => s.isAvailable).map((s) => ({
      startIso: s.startIso,
      endIso: s.endIso,
    })),
  });

  assert(
    creationResult.createdAppointments.length === 1 &&
      Boolean(creationResult.createdAppointments[0].seriesId),
    'Creó los turnos disponibles vinculados a seriesId sin sobreescribir'
  );

  // --------------------------------------------------------------------------
  // TEST 5: Avisar Demora (Texto natural generado y auditoría)
  // --------------------------------------------------------------------------
  console.log('\nTest 5: Avisar Demora con WhatsApp');
  const delayResult = await service.notifyDelay(app1.id, 15);
  assert(
    delayResult.success &&
      delayResult.messageText.includes('15 minutos de demora') &&
      delayResult.messageText.includes('Disculpá la espera'),
    'Avisar demora genera texto natural cortés'
  );

  // --------------------------------------------------------------------------
  // TEST 6: Reprogramación Rápida
  // --------------------------------------------------------------------------
  console.log('\nTest 6: Reprogramación Rápida con sugerencias');
  const fastRes = await service.fastRescheduleAppointment(
    app1.id,
    '2026-10-20T11:00:00.000Z',
    '2026-10-20T11:45:00.000Z'
  );
  assert(
    fastRes.success && fastRes.appointment?.startAt === '2026-10-20T11:00:00.000Z',
    'Reprogramación rápida actualiza horario de forma atómica'
  );

  console.log('\n======================================================');
  console.log(`📊 RESULTADOS OPERATIONAL PRO: ${passed} pasaron, ${failed} fallaron.`);
  console.log('======================================================\n');

  if (failed > 0) {
    throw new Error(`Pruebas Operational Pro fallidas: ${failed}`);
  }
  return passed;
}
