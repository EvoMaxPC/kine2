import { repositoryContainer } from '../repositories/RepositoryContainer.ts';
import { persistentStorageManager, getDefaultDemoState, CURRENT_SCHEMA_VERSION } from '../repositories/persistent/PersistentStorageManager.ts';
import { AppointmentService } from '../services/AppointmentService.ts';
import { DailyBriefingService } from '../services/DailyBriefingService.ts';
import { NextBestActionService } from '../services/NextBestActionService.ts';
import { MockWhatsAppProvider } from '../integrations/whatsapp/MockWhatsAppProvider.ts';
import { AppointmentStatus, DEFAULT_CLINIC_CONFIG } from '../types/index.ts';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[Smoke Test Failure] ${msg}`);
  }
}

export async function runSmokeTests() {
  console.log('--- RUNNING KINETURNOS RUNTIME SMOKE TESTS ---');

  // 1. Repositories initialization
  const repos = repositoryContainer.getRepositories();
  assert(!!repos.appointmentRepo, 'Appointment repository must be defined');
  assert(!!repos.patientRepo, 'Patient repository must be defined');
  assert(!!repos.requestRepo, 'Request repository must be defined');
  assert(!!repos.auditRepo, 'Audit repository must be defined');
  assert(!!repos.waitlistRepo, 'Waitlist repository must be defined');
  assert(!!repos.decisionRepo, 'Decision repository must be defined');
  console.log('✓ Test 1: Repositories bundle initialized correctly');

  // 2. Persistent storage default state & schema version
  const state = persistentStorageManager.getState();
  assert(state.schemaVersion === CURRENT_SCHEMA_VERSION, `Schema version must be ${CURRENT_SCHEMA_VERSION}`);
  assert(Array.isArray(state.patients) && state.patients.length > 0, 'Patients array must be loaded');
  assert(Array.isArray(state.appointments) && state.appointments.length > 0, 'Appointments array must be loaded');
  assert(Array.isArray(state.requests), 'Requests must be an array');
  assert(Array.isArray(state.auditLogs), 'Audit logs must be an array');
  assert(Array.isArray(state.waitlist), 'Waitlist must be an array');
  console.log('✓ Test 2: PersistentStorageManager loads valid state with schema version');

  // 3. AppointmentService getTodayOverview with default seed
  const whatsappProvider = new MockWhatsAppProvider(repos.conversationRepo);
  const appService = new AppointmentService(
    repos.appointmentRepo,
    repos.patientRepo,
    repos.requestRepo,
    repos.auditRepo,
    repos.conversationRepo,
    whatsappProvider,
    DEFAULT_CLINIC_CONFIG,
    repos.waitlistRepo,
    repos.professionalRepo
  );

  const overview = await appService.getTodayOverview();
  assert(!!overview, 'TodayOverview must be generated');
  assert(typeof overview.totalAppointmentsCount === 'number', 'totalAppointmentsCount must be a number');
  assert(Array.isArray(overview.waitingRoom), 'waitingRoom must be an array');
  assert(Array.isArray(overview.appointments), 'appointments must be an array');
  console.log('✓ Test 3: TodayOverview computed successfully with DEMO seed');

  // 4. DailyBriefingService resiliency
  const briefing = DailyBriefingService.generateBriefing(overview, []);
  assert(Array.isArray(briefing.items), 'Briefing items must be an array');
  assert(briefing.items.length <= 5, 'Briefing items must not exceed 5');

  // Test briefing with null/undefined overview
  const emptyBriefing = DailyBriefingService.generateBriefing(null as any, []);
  assert(Array.isArray(emptyBriefing.items), 'Briefing with null overview must return empty items safely');
  console.log('✓ Test 4: DailyBriefingService operates safely under all conditions');

  // 5. NextBestActionService resiliency
  const nextAction = NextBestActionService.evaluateNextAction(overview, [], []);
  // Should return action or null safely without throwing
  const nullAction = NextBestActionService.evaluateNextAction(null, [], []);
  assert(nullAction === null, 'NextBestAction with null overview must safely return null');
  console.log('✓ Test 5: NextBestActionService operates safely without exceptions');

  // 6. Patient search and list
  const patients = await repos.patientRepo.getAllPatients();
  assert(Array.isArray(patients) && patients.length > 0, 'getAllPatients must return array of patients');
  const searchResult = await repos.patientRepo.searchPatients('Laura');
  assert(Array.isArray(searchResult) && searchResult.length > 0, 'searchPatients must find matching patient');
  console.log('✓ Test 6: Patient repository search & listings are functional');

  console.log('📊 RESULTADOS SMOKE TESTS: 6 pasaron, 0 fallaron.');
  console.log('--- ALL SMOKE TESTS PASSED (100%) ---\n');
  return 6;
}
