import { IAppointmentRepository } from './IAppointmentRepository.ts';
import { IPatientRepository } from './IPatientRepository.ts';
import { IRequestRepository } from './IRequestRepository.ts';
import { IAuditRepository } from './IAuditRepository.ts';
import { IConversationRepository } from './IConversationRepository.ts';
import { IWaitlistRepository } from './IWaitlistRepository.ts';
import { IProfessionalRepository } from './IProfessionalRepository.ts';
import { IDecisionRepository } from './IDecisionRepository.ts';
import { IConversationSessionRepository } from './IConversationSessionRepository.ts';
import { IAutomationRuleRepository } from './IAutomationRuleRepository.ts';
import { DataMode } from '../types/index.ts';

// In-memory repositories (for testing or DEMO_MEMORY mode)
import { MockAppointmentRepository } from './MockAppointmentRepository.ts';
import { MockPatientRepository } from './MockPatientRepository.ts';
import { MockRequestRepository } from './MockRequestRepository.ts';
import { MockAuditRepository } from './MockAuditRepository.ts';
import { MockConversationRepository } from './MockConversationRepository.ts';
import { MockWaitlistRepository } from './MockWaitlistRepository.ts';
import { MockProfessionalRepository } from './MockProfessionalRepository.ts';
import { MockDecisionRepository } from './MockDecisionRepository.ts';
import { MockConversationSessionRepository } from './MockConversationSessionRepository.ts';
import { MockAutomationRuleRepository } from './MockAutomationRuleRepository.ts';

// Persistent repositories (browser-native local storage for DEMO_PERSISTENT mode)
import { PersistentAppointmentRepository } from './persistent/PersistentAppointmentRepository.ts';
import { PersistentPatientRepository } from './persistent/PersistentPatientRepository.ts';
import { PersistentRequestRepository } from './persistent/PersistentRequestRepository.ts';
import { PersistentAuditRepository } from './persistent/PersistentAuditRepository.ts';
import { PersistentConversationRepository } from './persistent/PersistentConversationRepository.ts';
import { PersistentWaitlistRepository } from './persistent/PersistentWaitlistRepository.ts';
import { PersistentProfessionalRepository } from './persistent/PersistentProfessionalRepository.ts';
import { PersistentDecisionRepository } from './persistent/PersistentDecisionRepository.ts';
import { persistentStorageManager } from './persistent/PersistentStorageManager.ts';

export interface RepositoriesBundle {
  appointmentRepo: IAppointmentRepository;
  patientRepo: IPatientRepository;
  requestRepo: IRequestRepository;
  auditRepo: IAuditRepository;
  conversationRepo: IConversationRepository;
  waitlistRepo: IWaitlistRepository;
  professionalRepo: IProfessionalRepository;
  decisionRepo: IDecisionRepository;
  conversationSessionRepo: IConversationSessionRepository;
  automationRuleRepo: IAutomationRuleRepository;
  dataMode: DataMode;
}

const DATA_MODE_STORAGE_KEY = 'kineturnos_active_data_mode';

function getInitialDataMode(): DataMode {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = window.localStorage.getItem(DATA_MODE_STORAGE_KEY) as DataMode;
    if (saved === 'DEMO_MEMORY' || saved === 'DEMO_PERSISTENT' || saved === 'FIREBASE') {
      return saved;
    }
  }
  return 'DEMO_PERSISTENT';
}

class RepositoryContainer {
  private currentMode: DataMode;
  private persistentBundle: RepositoriesBundle;
  private memoryBundle: RepositoriesBundle;

  constructor() {
    this.currentMode = getInitialDataMode();

    const sharedDecisionRepo = new MockDecisionRepository();
    const sharedSessionRepo = new MockConversationSessionRepository();
    const sharedRuleRepo = new MockAutomationRuleRepository();

    this.persistentBundle = {
      appointmentRepo: new PersistentAppointmentRepository(),
      patientRepo: new PersistentPatientRepository(),
      requestRepo: new PersistentRequestRepository(),
      auditRepo: new PersistentAuditRepository(),
      conversationRepo: new PersistentConversationRepository(),
      waitlistRepo: new PersistentWaitlistRepository(),
      professionalRepo: new PersistentProfessionalRepository(),
      decisionRepo: new PersistentDecisionRepository(),
      conversationSessionRepo: sharedSessionRepo,
      automationRuleRepo: sharedRuleRepo,
      dataMode: 'DEMO_PERSISTENT',
    };

    this.memoryBundle = {
      appointmentRepo: new MockAppointmentRepository(),
      patientRepo: new MockPatientRepository(),
      requestRepo: new MockRequestRepository(),
      auditRepo: new MockAuditRepository(),
      conversationRepo: new MockConversationRepository(),
      waitlistRepo: new MockWaitlistRepository(),
      professionalRepo: new MockProfessionalRepository(),
      decisionRepo: new MockDecisionRepository(),
      conversationSessionRepo: new MockConversationSessionRepository(),
      automationRuleRepo: new MockAutomationRuleRepository(),
      dataMode: 'DEMO_MEMORY',
    };
  }

  public getDataMode(): DataMode {
    return this.currentMode;
  }

  public setDataMode(mode: DataMode): void {
    this.currentMode = mode;
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(DATA_MODE_STORAGE_KEY, mode);
    }
  }

  public getRepositories(): RepositoriesBundle {
    if (this.currentMode === 'DEMO_MEMORY') {
      return this.memoryBundle;
    }
    // Default en esta fase: DEMO_PERSISTENT
    return this.persistentBundle;
  }

  public resetDemoData(): void {
    persistentStorageManager.resetDemoData();
  }
}

export const repositoryContainer = new RepositoryContainer();
