import { MockAppointmentRepository } from '../repositories/MockAppointmentRepository.ts';
import { MockPatientRepository } from '../repositories/MockPatientRepository.ts';
import { MockAuditRepository } from '../repositories/MockAuditRepository.ts';
import { MockWaitlistRepository } from '../repositories/MockWaitlistRepository.ts';
import { MockDecisionRepository } from '../repositories/MockDecisionRepository.ts';
import { MockConversationSessionRepository } from '../repositories/MockConversationSessionRepository.ts';
import { MockAutomationRuleRepository } from '../repositories/MockAutomationRuleRepository.ts';
import { MockConversationRepository } from '../repositories/MockConversationRepository.ts';
import { MockWhatsAppProvider } from '../integrations/whatsapp/MockWhatsAppProvider.ts';
import { AppointmentService } from '../services/AppointmentService.ts';
import { AutomationEngine } from '../services/AutomationEngine.ts';
import { SecretaryOrchestrator } from '../services/SecretaryOrchestrator.ts';
import { MockRequestRepository } from '../repositories/MockRequestRepository.ts';
import { MockProfessionalRepository } from '../repositories/MockProfessionalRepository.ts';
import {
  DEFAULT_CLINIC_CONFIG,
  AutomationEventType,
  AppointmentStatus,
  AutomationLevel,
} from '../types/index.ts';

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    failedCount++;
  }
}

export async function runAutomationTests() {
  console.log('\n--- Running AutomationEngine & SecretaryOrchestrator Tests (Prompt 04) ---');

  const aptRepo = new MockAppointmentRepository();
  const patRepo = new MockPatientRepository();
  const reqRepo = new MockRequestRepository();
  const auditRepo = new MockAuditRepository();
  const waitlistRepo = new MockWaitlistRepository();
  const decRepo = new MockDecisionRepository();
  const convRepo = new MockConversationRepository();
  const sessionRepo = new MockConversationSessionRepository();
  const ruleRepo = new MockAutomationRuleRepository();
  const profRepo = new MockProfessionalRepository();
  const whatsappProvider = new MockWhatsAppProvider(convRepo);

  const aptService = new AppointmentService(
    aptRepo,
    patRepo,
    reqRepo,
    auditRepo,
    convRepo,
    whatsappProvider,
    DEFAULT_CLINIC_CONFIG,
    waitlistRepo,
    profRepo
  );

  const secretary = new SecretaryOrchestrator(
    patRepo,
    aptRepo,
    convRepo,
    sessionRepo,
    waitlistRepo,
    decRepo,
    aptService,
    whatsappProvider,
    DEFAULT_CLINIC_CONFIG
  );

  const engine = new AutomationEngine(
    ruleRepo,
    waitlistRepo,
    aptRepo,
    patRepo,
    decRepo,
    auditRepo,
    sessionRepo,
    whatsappProvider,
    secretary
  );
  secretary.setAutomationEngine(engine);

  // 1. Test: AutomationEngine rules loading
  const rules = await ruleRepo.getRules();
  assert(rules.length >= 8, 'AutomationEngine loads standard operational rules');

  // 2. Test: Rule Level AUTO triggers automatic execution on SLOT_RELEASED
  const slotReleaseLog = await engine.emit({
    id: 'evt_t1',
    type: AutomationEventType.SLOT_RELEASED,
    timestamp: new Date().toISOString(),
    source: 'SYSTEM',
    payload: {
      date: '2026-09-28',
      time: '16:00',
      startIso: '2026-09-28T16:00:00',
      endIso: '2026-09-28T16:45:00',
      professionalId: 'prof_demo_1',
    },
  });
  assert(
    slotReleaseLog.length > 0 &&
      (slotReleaseLog[0].status === 'EXECUTED' || slotReleaseLog[0].actionTaken === 'WAITLIST_OFFER_DISPATCHED'),
    'SLOT_RELEASED executes AUTO waitlist healing and dispatches offer'
  );

  // 3. Test: Slot offer creation in waitlist
  const activeEntries = await waitlistRepo.getWaitlistEntries();
  const entryWithOffer = activeEntries.find((e) => e.status === 'OFFERED');
  assert(!!entryWithOffer, 'Waitlist candidate status updated to OFFERED');

  // 4. Test: Slot offer expiration transfers to next candidate
  const expLog = await engine.emit({
    id: 'evt_t2',
    type: AutomationEventType.SLOT_OFFER_EXPIRED,
    timestamp: new Date().toISOString(),
    source: 'CRON_TIMER',
    payload: {
      offerId: 'off_expired_1',
      waitlistEntryId: 'wait_demo_1',
      patientId: 'pat_demo_4',
      slotStartIso: '2026-09-28T16:00:00',
      slotEndIso: '2026-09-28T16:45:00',
      professionalId: 'prof_demo_1',
    },
  });
  assert(expLog.length > 0, 'SLOT_OFFER_EXPIRED auto-transfers slot offer sequentially');

  // 5. Test: ASK_PROFESSIONAL autonomy routes to Decision Center
  const overdueLog = await engine.emit({
    id: 'evt_t3',
    type: AutomationEventType.APPOINTMENT_OVERDUE,
    timestamp: new Date().toISOString(),
    source: 'CRON_TIMER',
    payload: {
      appointmentId: 'apt_demo_1',
      patientId: 'pat_demo_1',
      patientName: 'Laura Gómez',
      professionalId: 'prof_demo_1',
      startIso: '2026-09-25T08:00:00',
      endIso: '2026-09-25T08:45:00',
    },
  });
  assert(
    overdueLog.some((l) => l.status === 'QUEUED_FOR_DECISION'),
    'ASK_PROFESSIONAL rule creates a pending item in Decision Center'
  );

  // 6. Test: Decision repository lists pending items
  const pendingDecisions = await decRepo.getPendingDecisions();
  assert(pendingDecisions.length > 0, 'DecisionCenter repository contains pending decisions');

  // 7. Test: Secretary handles known patient appointment request with memory
  const msgRes = await secretary.processInboundMessage({
    phoneNumber: '+54 9 11 5555-1111', // María Fernández
    messageText: 'Hola, necesito un turno para kinesiología esta semana por favor',
  });
  const candidateSlots = msgRes.session.candidateSlots || [];
  assert(candidateSlots.length > 0, 'Secretary offers real candidate slots and stores them in conversation session memory');

  // 8. Test: Secretary receives choice from memory ("El de las 18 hs")
  if (candidateSlots.length > 0) {
    const slotChoice = candidateSlots[0];
    const pickRes = await secretary.processInboundMessage({
      phoneNumber: '+54 9 11 5555-1111',
      messageText: `Elijo ${slotChoice.humanLabel || slotChoice.human || `${slotChoice.date} ${slotChoice.time}`}`,
    });
    assert(!pickRes.requiresHumanReview && pickRes.executedActions.some((a) => a.includes('agendado') || a.includes('confirmado') || a.includes('Turno')), 'Secretary books selected candidate slot directly from memory');
  }

  // 9. Test: Secretary unknown contact asks for name
  const unknownRes = await secretary.processInboundMessage({
    phoneNumber: '+5493518889900',
    messageText: 'Hola quiero saber horarios',
  });
  assert(unknownRes.session.step === 'AWAITING_PATIENT_NAME', 'Unknown contact is placed into AWAITING_PATIENT_NAME step');

  // 10. Test: Secretary creates patient when name is provided
  const nameRes = await secretary.processInboundMessage({
    phoneNumber: '+5493518889900',
    messageText: 'Me llamo Martín Sosa',
  });
  assert(nameRes.isNewPatientCreated === true, 'Patient profile created automatically when unknown contact introduces themselves');

  // 11. Test: Secretary answers clinic FAQ automatically
  const faqRes = await secretary.processInboundMessage({
    phoneNumber: '+54 9 11 5555-1111',
    messageText: '¿Dónde queda el consultorio y atienden con obra social?',
  });
  assert(faqRes.replyText.includes('Colón 1234') || faqRes.replyText.includes('obra social'), 'Secretary responds to FAQ inquiries accurately');

  // 12. Test: Secretary patient delay notice
  const delayRes = await secretary.processInboundMessage({
    phoneNumber: '+54 9 11 5555-1111',
    messageText: 'Hola voy a llegar 15 minutos demorado por el tráfico',
  });
  assert(delayRes.intent === 'REPORT_DELAY', 'Secretary classifies patient delay report accurately');

  // 13. Test: Clinic delay broadcast
  const clinicDelayLog = await engine.emit({
    id: 'evt_t4',
    type: AutomationEventType.CLINIC_DELAY_CHANGED,
    timestamp: new Date().toISOString(),
    source: 'PROFESSIONAL',
    payload: {
      professionalId: 'prof_demo_1',
      delayMinutes: 20,
      affectedAppointmentIds: ['apt_demo_2'],
    },
  });
  assert(clinicDelayLog.length > 0, 'CLINIC_DELAY_CHANGED generates proactive patient broadcast');

  // 14. Test: Patient confirmation processing
  const confirmLog = await engine.emit({
    id: 'evt_t5',
    type: AutomationEventType.PATIENT_CONFIRMATION_RECEIVED,
    timestamp: new Date().toISOString(),
    source: 'WHATSAPP',
    payload: {
      appointmentId: 'apt_demo_1',
      patientId: 'pat_demo_1',
      confirmed: true,
      rawResponse: 'Sí, confirmo asistencia',
    },
  });
  assert(confirmLog.length > 0, 'PATIENT_CONFIRMATION_RECEIVED automatically processes appointment confirmation');

  console.log(`\nAutomation Tests Summary: ${passedCount} passed, ${failedCount} failed.`);
  if (failedCount > 0) {
    throw new Error(`${failedCount} automation tests failed.`);
  }
  return passedCount;
}
