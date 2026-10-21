import { MockAppointmentRepository } from '../repositories/MockAppointmentRepository.ts';
import { MockPatientRepository } from '../repositories/MockPatientRepository.ts';
import { MockRequestRepository } from '../repositories/MockRequestRepository.ts';
import { MockAuditRepository } from '../repositories/MockAuditRepository.ts';
import { MockConversationRepository } from '../repositories/MockConversationRepository.ts';
import { MockWhatsAppProvider } from '../integrations/whatsapp/MockWhatsAppProvider.ts';
import { AppointmentService } from '../services/AppointmentService.ts';
import {
  AppointmentStatus,
  isValidAppointmentStatus,
  RequestType,
  RequestStatus,
  DEFAULT_CLINIC_CONFIG,
} from '../types/index.ts';
import { PatientIntent } from '../integrations/ai/PatientIntent.ts';
import { ConversationPolicy } from '../integrations/ai/ConversationPolicy.ts';

// Test runner helper
let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    failedCount++;
  }
}

export async function runAllDomainTests() {
  console.log('\n======================================================');
  console.log('🧪 EJECUTANDO PRUEBAS DE DOMINIO & REGLAS DE NEGOCIO');
  console.log('======================================================\n');

  // Setup Fresh Repositories
  const appointmentRepo = new MockAppointmentRepository([]);
  const patientRepo = new MockPatientRepository([]);
  const requestRepo = new MockRequestRepository([]);
  const auditRepo = new MockAuditRepository([]);
  const conversationRepo = new MockConversationRepository([]);
  const whatsappProvider = new MockWhatsAppProvider(conversationRepo);

  const service = new AppointmentService(
    appointmentRepo,
    patientRepo,
    requestRepo,
    auditRepo,
    conversationRepo,
    whatsappProvider,
    { ...DEFAULT_CLINIC_CONFIG }
  );

  // --------------------------------------------------------------------------
  // TEST 1: No permitir dos turnos confirmados superpuestos para el mismo profesional
  // --------------------------------------------------------------------------
  console.log('Test 1: No permitir dos turnos confirmados superpuestos para el mismo profesional');
  const app1 = await appointmentRepo.createAppointment({
    patientId: 'pat_1',
    professionalId: 'prof_1',
    startAt: '2026-10-01T09:00:00.000Z',
    endAt: '2026-10-01T10:00:00.000Z',
    durationMinutes: 60,
    status: AppointmentStatus.CONFIRMED,
    source: 'MANUAL_STAFF',
  });

  let threwOverlapError = false;
  try {
    await appointmentRepo.createAppointment({
      patientId: 'pat_2',
      professionalId: 'prof_1', // Mismo profesional
      startAt: '2026-10-01T09:30:00.000Z', // Se superpone de 9:30 a 10:30
      endAt: '2026-10-01T10:30:00.000Z',
      durationMinutes: 60,
      status: AppointmentStatus.CONFIRMED,
      source: 'MANUAL_STAFF',
    });
  } catch (err) {
    threwOverlapError = true;
  }
  assert(threwOverlapError, 'Rechazo estricto de superposición de turnos para el mismo profesional');

  // --------------------------------------------------------------------------
  // TEST 2: Permitir horarios iguales para profesionales distintos
  // --------------------------------------------------------------------------
  console.log('\nTest 2: Permitir horarios iguales para profesionales distintos');
  let allowedDiffProf = false;
  try {
    const appDifferentProf = await appointmentRepo.createAppointment({
      patientId: 'pat_3',
      professionalId: 'prof_2', // Profesional distinto
      startAt: '2026-10-01T09:00:00.000Z', // Mismo horario exacto
      endAt: '2026-10-01T10:00:00.000Z',
      durationMinutes: 60,
      status: AppointmentStatus.CONFIRMED,
      source: 'MANUAL_STAFF',
    });
    allowedDiffProf = !!appDifferentProf.id;
  } catch (err) {
    allowedDiffProf = false;
  }
  assert(allowedDiffProf, 'Creación permitida para profesionales distintos en simultáneo');

  // --------------------------------------------------------------------------
  // TEST 3: Cancelar turno cambia estado pero no elimina registro
  // --------------------------------------------------------------------------
  console.log('\nTest 3: Cancelar turno cambia estado pero no elimina registro');
  const cancelledApp = await appointmentRepo.cancelAppointment(app1.id);
  const fetchedApp = await appointmentRepo.getAppointmentById(app1.id);
  assert(
    fetchedApp !== null &&
      fetchedApp.status === AppointmentStatus.CANCELLED &&
      cancelledApp.status === AppointmentStatus.CANCELLED,
    'El turno cancelado permanece en base de datos con status CANCELLED'
  );

  // --------------------------------------------------------------------------
  // TEST 4: Aprobar solicitud de cambio valida nuevamente disponibilidad
  // --------------------------------------------------------------------------
  console.log('\nTest 4: Aprobar solicitud de cambio valida nuevamente disponibilidad');
  const mariaApp = await appointmentRepo.createAppointment({
    patientId: 'pat_maria',
    professionalId: 'prof_1',
    startAt: '2026-10-02T16:00:00.000Z',
    endAt: '2026-10-02T17:00:00.000Z',
    durationMinutes: 60,
    status: AppointmentStatus.CONFIRMED,
    source: 'WHATSAPP_AI',
  });

  const reqChange = await requestRepo.createRequest({
    type: RequestType.CHANGE,
    patientId: 'pat_maria',
    professionalId: 'prof_1',
    currentAppointmentId: mariaApp.id,
    requestedStartAt: '2026-10-02T18:00:00.000Z',
    requestedEndAt: '2026-10-02T19:00:00.000Z',
    patientMessage: 'Cambiar a las 18 hs',
  });

  // Ocupamos las 18:00 antes de que el kinesiólogo acepte
  await appointmentRepo.createAppointment({
    patientId: 'pat_otro',
    professionalId: 'prof_1',
    startAt: '2026-10-02T18:00:00.000Z',
    endAt: '2026-10-02T19:00:00.000Z',
    durationMinutes: 60,
    status: AppointmentStatus.CONFIRMED,
    source: 'MANUAL_STAFF',
  });

  const approvalResult = await service.approveRequest(reqChange.id);
  const mariaAppUnchanged = await appointmentRepo.getAppointmentById(mariaApp.id);

  assert(
    approvalResult.success === false &&
      Boolean(approvalResult.error?.includes('Este horario acaba de dejar de estar disponible')) &&
      mariaAppUnchanged?.startAt === '2026-10-02T16:00:00.000Z',
    'La aprobación falló limpiamente por ocupación concurrente sin modificar el turno original'
  );

  // --------------------------------------------------------------------------
  // TEST 5: No aprobar una solicitud ya resuelta
  // --------------------------------------------------------------------------
  console.log('\nTest 5: No aprobar una solicitud ya resuelta');
  const reqAlreadyResolved = await requestRepo.createRequest({
    type: RequestType.CANCEL,
    patientId: 'pat_maria',
    professionalId: 'prof_1',
    currentAppointmentId: mariaApp.id,
    patientMessage: 'Cancelar',
  });
  await requestRepo.updateRequestStatus(reqAlreadyResolved.id, RequestStatus.REJECTED);

  const reApproval = await service.approveRequest(reqAlreadyResolved.id);
  assert(
    reApproval.success === false &&
      reApproval.error === 'Esta solicitud ya fue resuelta previamente.',
    'Rechazo de intento de modificar una solicitud ya resuelta'
  );

  // --------------------------------------------------------------------------
  // TEST 6: Una intención AMBIGUOUS exige aclaración
  // --------------------------------------------------------------------------
  console.log('\nTest 6: Una intención AMBIGUOUS exige aclaración');
  const validAmbiguousExtraction = {
    intent: PatientIntent.AMBIGUOUS,
    confidence: 0.5,
    requiresClarification: true,
    clarificationQuestion: '¿Podrías confirmarme si buscás turno para esta semana o la próxima?',
  };
  const invalidAmbiguousExtraction = {
    intent: PatientIntent.AMBIGUOUS,
    confidence: 0.5,
    requiresClarification: false,
  };

  const isContractValid = ConversationPolicy.validateExtractionContract(validAmbiguousExtraction);
  const isInvalidContractBlocked = !ConversationPolicy.validateExtractionContract(invalidAmbiguousExtraction);

  assert(
    isContractValid && isInvalidContractBlocked,
    'Contrato conversacional exige requiresClarification=true para intenciones ambiguas'
  );

  // --------------------------------------------------------------------------
  // TEST 7: Appointment status solo acepta valores autorizados
  // --------------------------------------------------------------------------
  console.log('\nTest 7: Appointment status solo acepta valores autorizados');
  assert(isValidAppointmentStatus('CONFIRMED'), 'CONFIRMED es un status válido');
  assert(isValidAppointmentStatus('PENDING_APPROVAL'), 'PENDING_APPROVAL es un status válido');
  assert(isValidAppointmentStatus('NO_SHOW'), 'NO_SHOW es un status válido');
  assert(!isValidAppointmentStatus('INVALID_RANDOM_STRING'), 'String arbitrario es rechazado');
  assert(!isValidAppointmentStatus('COMPLETED_EXTRA'), 'Variante no estándar es rechazada');

  // --------------------------------------------------------------------------
  // TEST 8: Un doble envío lógico no genera dos reservas
  // --------------------------------------------------------------------------
  console.log('\nTest 8: Un doble envío lógico no genera dos reservas');
  const slotDate = '2026-10-05T10:00:00.000Z';
  const slotEndDate = '2026-10-05T11:00:00.000Z';

  const p1 = service.createManualAppointment({
    patientId: 'pat_1',
    professionalId: 'prof_1',
    startAt: slotDate,
    endAt: slotEndDate,
    durationMinutes: 60,
  });

  const p2 = service.createManualAppointment({
    patientId: 'pat_2',
    professionalId: 'prof_1',
    startAt: slotDate,
    endAt: slotEndDate,
    durationMinutes: 60,
  });

  const [res1, res2] = await Promise.all([p1, p2]);
  const successfulReservations = [res1, res2].filter((r) => r.success);
  assert(
    successfulReservations.length === 1,
    'Exactamente una reserva fue creada ante un doble click concurrente en el mismo slot'
  );

  // ==========================================================================
  // NUEVAS PRUEBAS REQUERIDAS (PROMPT MAESTRO 02)
  // ==========================================================================

  // --------------------------------------------------------------------------
  // TEST 9: ScheduleBlock hace que un horario deje de estar disponible
  // --------------------------------------------------------------------------
  console.log('\nTest 9: ScheduleBlock hace que un horario deje de estar disponible');
  const blockStart = '2026-10-06T14:00:00.000Z';
  const blockEnd = '2026-10-06T15:00:00.000Z';

  // Antes del bloqueo, el horario está disponible
  const availBefore = await appointmentRepo.checkAvailability('prof_1', blockStart, blockEnd);
  assert(availBefore === true, 'El horario está disponible antes del bloqueo');

  // Creamos el bloqueo
  await service.createScheduleBlock({
    professionalId: 'prof_1',
    startAt: blockStart,
    endAt: blockEnd,
    reason: 'Trámite personal',
  });

  // Tras el bloqueo, debe dar false
  const availAfter = await appointmentRepo.checkAvailability('prof_1', blockStart, blockEnd);
  assert(availAfter === false, 'El horario pasa a NO DISPONIBLE tras crear ScheduleBlock');

  // --------------------------------------------------------------------------
  // TEST 10: Turno COMPLETED no aparece como futuro / activo
  // --------------------------------------------------------------------------
  console.log('\nTest 10: Turno COMPLETED no aparece como futuro / activo');
  const appCompleted = await appointmentRepo.createAppointment({
    patientId: 'pat_completed_test',
    professionalId: 'prof_1',
    startAt: '2026-10-07T10:00:00.000Z',
    endAt: '2026-10-07T11:00:00.000Z',
    durationMinutes: 60,
    status: AppointmentStatus.CONFIRMED,
    source: 'MANUAL_STAFF',
  });

  // Cambiamos a COMPLETED (Atendido)
  await appointmentRepo.updateAppointmentStatus(appCompleted.id, AppointmentStatus.COMPLETED);
  const activeApps = await appointmentRepo.getPatientActiveAppointments('pat_completed_test');
  const containsCompleted = activeApps.some((a) => a.id === appCompleted.id);

  assert(!containsCompleted, 'Un turno con estado COMPLETED no aparece entre los turnos activos futuros');

  // --------------------------------------------------------------------------
  // TEST 11: NO_SHOW conserva historial y actualiza estado
  // --------------------------------------------------------------------------
  console.log('\nTest 11: NO_SHOW conserva historial y actualiza estado');
  const appNoShow = await appointmentRepo.createAppointment({
    patientId: 'pat_noshow_test',
    professionalId: 'prof_1',
    startAt: '2026-10-08T11:00:00.000Z',
    endAt: '2026-10-08T12:00:00.000Z',
    durationMinutes: 60,
    status: AppointmentStatus.CONFIRMED,
    source: 'MANUAL_STAFF',
  });

  await service.updateStatus(appNoShow.id, AppointmentStatus.NO_SHOW, 'El paciente no asistió');
  const fetchedNoShow = await appointmentRepo.getAppointmentById(appNoShow.id);

  assert(
    fetchedNoShow !== null && fetchedNoShow.status === AppointmentStatus.NO_SHOW,
    'El turno NO_SHOW permanece en base de datos con status NO_SHOW conservando historial'
  );

  // --------------------------------------------------------------------------
  // TEST 12: Proponer horario ocupado debe rechazarse
  // --------------------------------------------------------------------------
  console.log('\nTest 12: Proponer horario ocupado debe rechazarse');
  // Creamos turno que ocupa las 16:00
  await appointmentRepo.createAppointment({
    patientId: 'pat_busy_slot',
    professionalId: 'prof_1',
    startAt: '2026-10-09T16:00:00.000Z',
    endAt: '2026-10-09T17:00:00.000Z',
    durationMinutes: 60,
    status: AppointmentStatus.CONFIRMED,
    source: 'MANUAL_STAFF',
  });

  const reqToPropose = await requestRepo.createRequest({
    type: RequestType.CHANGE,
    patientId: 'pat_1',
    professionalId: 'prof_1',
    patientMessage: 'Cambiar',
  });

  // Intentamos proponer las 16:00 (ocupadas)
  const propResult = await service.proposeAlternative(
    reqToPropose.id,
    '2026-10-09T16:00:00.000Z',
    '2026-10-09T17:00:00.000Z'
  );

  assert(
    propResult.success === false &&
      Boolean(propResult.error?.includes('La alternativa propuesta no está disponible')),
    'Proponer un horario ya ocupado es rechazado con error claro'
  );

  // --------------------------------------------------------------------------
  // TEST 13: bufferBetweenAppointmentsMinutes afecta disponibilidad
  // --------------------------------------------------------------------------
  console.log('\nTest 13: bufferBetweenAppointmentsMinutes afecta disponibilidad');
  const bufferService = new AppointmentService(
    appointmentRepo,
    patientRepo,
    requestRepo,
    auditRepo,
    conversationRepo,
    whatsappProvider,
    { ...DEFAULT_CLINIC_CONFIG, bufferBetweenAppointmentsMinutes: 15 }
  );

  // Supongamos un turno de 09:00 a 10:00
  await appointmentRepo.createAppointment({
    patientId: 'pat_buf_1',
    professionalId: 'prof_buf',
    startAt: '2026-10-10T09:00:00.000Z',
    endAt: '2026-10-10T10:00:00.000Z',
    durationMinutes: 60,
    status: AppointmentStatus.CONFIRMED,
    source: 'MANUAL_STAFF',
  });

  // Con buffer de 15 min, el turno de 10:00 a 11:00 se superpone con el buffer post-sesión (hasta 10:15)
  const isAvailableWithinBuffer = await appointmentRepo.checkAvailability(
    'prof_buf',
    '2026-10-10T10:00:00.000Z',
    '2026-10-10T11:00:00.000Z',
    undefined,
    15
  );

  // Pero a las 10:15 sí está disponible
  const isAvailableAfterBuffer = await appointmentRepo.checkAvailability(
    'prof_buf',
    '2026-10-10T10:15:00.000Z',
    '2026-10-10T11:15:00.000Z',
    undefined,
    15
  );

  assert(
    isAvailableWithinBuffer === false && isAvailableAfterBuffer === true,
    'El buffer configurado expande la protección de disponibilidad entre turnos'
  );

  // --------------------------------------------------------------------------
  // TEST 14: Acción repetida no genera dos ScheduleBlock
  // --------------------------------------------------------------------------
  console.log('\nTest 14: Acción repetida no genera dos ScheduleBlock');
  const blockRepeatStart = '2026-10-12T16:00:00.000Z';
  const blockRepeatEnd = '2026-10-12T17:00:00.000Z';

  const block1 = await service.createScheduleBlock({
    professionalId: 'prof_1',
    startAt: blockRepeatStart,
    endAt: blockRepeatEnd,
    reason: 'Reunión clínica',
  });

  const block2 = await service.createScheduleBlock({
    professionalId: 'prof_1',
    startAt: blockRepeatStart,
    endAt: blockRepeatEnd,
    reason: 'Reunión clínica',
  });

  assert(
    block1.success === true && block2.success === false,
    'Un intento repetido de bloquear el mismo horario es rechazado para evitar duplicados'
  );

  console.log('\n======================================================');
  console.log(`📊 RESULTADO FINAL DE PRUEBAS: ${passedCount} pasaron, ${failedCount} fallaron.`);
  console.log('======================================================\n');

  if (failedCount > 0) {
    throw new Error(`Pruebas fallidas: ${failedCount}`);
  }
  return passedCount;
}
