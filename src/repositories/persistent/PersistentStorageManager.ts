import {
  Patient,
  Professional,
  Appointment,
  ScheduleBlock,
  AppointmentRequest,
  AuditEvent,
  ConversationMessage,
  WaitlistEntry,
  SlotOffer,
  ClinicConfig,
  DEFAULT_CLINIC_CONFIG,
  DecisionItem,
  ConversationSession,
  PatientDelayNotice,
  ClinicDelayState,
} from '../../types/index.ts';
import {
  DEMO_PATIENTS,
  DEMO_PROFESSIONALS,
  DEMO_INITIAL_APPOINTMENTS,
  DEMO_REQUESTS,
  DEMO_AUDIT_LOGS,
  DEMO_CONVERSATIONS,
  DEMO_WAITLIST_ENTRIES,
} from '../../mock/demoData.ts';

export const CURRENT_SCHEMA_VERSION = 4;
export const STORAGE_KEY = 'kineturnos_demo_persistent_v4';
const LEGACY_STORAGE_KEYS = ['kineturnos_demo_persistent_v3', 'kineturnos_demo_persistent_v2', 'kineturnos_demo_data_v1'];

export interface PersistentDataState {
  schemaVersion: number;
  patients: Patient[];
  professionals: Professional[];
  appointments: Appointment[];
  scheduleBlocks: ScheduleBlock[];
  requests: AppointmentRequest[];
  auditLogs: AuditEvent[];
  conversations: Record<string, ConversationMessage[]>;
  waitlist: WaitlistEntry[];
  slotOffers: SlotOffer[];
  config: ClinicConfig;
  decisionItems: DecisionItem[];
  conversationSessions: Record<string, ConversationSession>;
  patientDelayNotices: PatientDelayNotice[];
  clinicDelay: ClinicDelayState | null;
}

export const INITIAL_DEMO_DECISIONS: DecisionItem[] = [
  {
    id: 'dec_demo_1',
    type: 'EXCEPTION_REQUEST',
    priority: 'HIGH',
    status: 'PENDING',
    title: 'Cambio solicitado por paciente (Laura Gómez)',
    whatHappened: 'Laura Gómez solicita reprogramar su turno de mañana a las 17:00 hs por una reunión laboral imprevista.',
    systemProposal: 'Mejor alternativa encontrada que respeta su preferencia de tarde: Jueves 18:00 hs con Lic. Martín Rodríguez.',
    recommendedActions: [
      {
        id: 'act_1_accept',
        type: 'ACCEPT_PROPOSAL',
        title: 'Aceptar propuesta (Jueves 18:00)',
        description: 'Mueve el turno al Jueves 18:00 hs y despacha confirmación por WhatsApp.',
        isPrimary: true,
      },
      {
        id: 'act_1_see_others',
        type: 'SEE_OTHERS',
        title: 'Ver otras alternativas',
        description: 'Explorar otros horarios libres disponibles en la agenda.',
      },
      {
        id: 'act_1_manual',
        type: 'MANUAL_REPLY',
        title: 'Responder manualmente',
        description: 'Abrir el chat de WhatsApp para coordinar de forma personalizada.',
      },
    ],
    patientId: 'pat_demo_1',
    patientName: 'Laura Gómez',
    patientPhone: '+54 9 351 555-0101',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: 'dec_demo_2',
    type: 'WAITLIST_OFFER_APPROVAL',
    priority: 'NORMAL',
    status: 'PENDING',
    title: 'Oferta de slot liberado para lista de espera',
    whatHappened: 'Se liberó el turno del Miércoles a las 16:00 hs. Hay 2 pacientes en lista de espera compatibles.',
    systemProposal: 'Ofertar turno a Mariana Soria (en espera hace 3 días, preferencia horario tarde). Tiempo de respuesta: 15 min.',
    recommendedActions: [
      {
        id: 'act_2_offer',
        type: 'SEND_WAITLIST_OFFER',
        title: 'Enviar oferta a Mariana',
        description: 'Envía mensaje de oferta secuencial con expiración configurada.',
        isPrimary: true,
      },
      {
        id: 'act_2_skip',
        type: 'DISMISS',
        title: 'Dejar slot libre',
        description: 'Mantener el slot abierto para asignación general.',
      },
    ],
    patientId: 'pat_demo_4',
    patientName: 'Mariana Soria',
    patientPhone: '+54 9 351 555-0104',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
];

export function getDefaultDemoState(): PersistentDataState {
  const convMap: Record<string, ConversationMessage[]> = {};
  for (const msg of DEMO_CONVERSATIONS) {
    if (!convMap[msg.patientId]) {
      convMap[msg.patientId] = [];
    }
    convMap[msg.patientId].push(msg);
  }

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    patients: JSON.parse(JSON.stringify(DEMO_PATIENTS)),
    professionals: JSON.parse(JSON.stringify(DEMO_PROFESSIONALS)),
    appointments: JSON.parse(JSON.stringify(DEMO_INITIAL_APPOINTMENTS)),
    scheduleBlocks: [],
    requests: JSON.parse(JSON.stringify(DEMO_REQUESTS)),
    auditLogs: JSON.parse(JSON.stringify(DEMO_AUDIT_LOGS)),
    conversations: convMap,
    waitlist: JSON.parse(JSON.stringify(DEMO_WAITLIST_ENTRIES)),
    slotOffers: [],
    config: JSON.parse(JSON.stringify(DEFAULT_CLINIC_CONFIG)),
    decisionItems: JSON.parse(JSON.stringify(INITIAL_DEMO_DECISIONS)),
    conversationSessions: {},
    patientDelayNotices: [],
    clinicDelay: null,
  };
}

class PersistentStorageManager {
  private state: PersistentDataState;
  private isBrowser: boolean;
  private wasRestored: boolean = false;

  constructor() {
    this.isBrowser = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
    this.state = this.loadState();
  }

  private loadState(): PersistentDataState {
    const defaultState = getDefaultDemoState();
    if (!this.isBrowser) {
      return defaultState;
    }

    try {
      // 1. Try to read current storage key
      let raw = window.localStorage.getItem(STORAGE_KEY);

      // 2. If not found, look for legacy keys to migrate
      if (!raw) {
        for (const legacyKey of LEGACY_STORAGE_KEYS) {
          const legacyRaw = window.localStorage.getItem(legacyKey);
          if (legacyRaw) {
            raw = legacyRaw;
            break;
          }
        }
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          // Validate array collections safely
          const safePatients = Array.isArray(parsed.patients) && parsed.patients.length > 0
            ? parsed.patients
            : defaultState.patients;

          const safeProfessionals = Array.isArray(parsed.professionals) && parsed.professionals.length > 0
            ? parsed.professionals
            : defaultState.professionals;

          const safeAppointments = Array.isArray(parsed.appointments)
            ? parsed.appointments
            : defaultState.appointments;

          const safeRequests = Array.isArray(parsed.requests)
            ? parsed.requests
            : defaultState.requests;

          const safeAuditLogs = Array.isArray(parsed.auditLogs)
            ? parsed.auditLogs
            : defaultState.auditLogs;

          const safeWaitlist = Array.isArray(parsed.waitlist)
            ? parsed.waitlist
            : defaultState.waitlist;

          const safeDecisions = Array.isArray(parsed.decisionItems)
            ? parsed.decisionItems
            : defaultState.decisionItems;

          const safeConversations = parsed.conversations && typeof parsed.conversations === 'object'
            ? parsed.conversations
            : defaultState.conversations;

          const loadedConfig = parsed.config && typeof parsed.config === 'object' ? { ...defaultState.config, ...parsed.config } : defaultState.config;
          if (loadedConfig.clinicName && loadedConfig.clinicName.includes('DEMO')) {
            loadedConfig.clinicName = loadedConfig.clinicName.replace(/\s*DEMO/gi, '').trim() || 'Consultorio Kinesiológico';
          }
          if (loadedConfig.professionalDisplayName && loadedConfig.professionalDisplayName.includes('DEMO')) {
            loadedConfig.professionalDisplayName = 'Lic. Martín Rodríguez';
          }

          const cleanedProfessionals = safeProfessionals.map((p: Professional) => {
            if (p.displayName?.includes('DEMO') || p.lastName?.includes('DEMO')) {
              if (p.id === 'prof_demo_1') {
                return { ...p, firstName: 'Martín', lastName: 'Rodríguez', displayName: 'Lic. Martín Rodríguez' };
              }
              if (p.id === 'prof_demo_2') {
                return { ...p, firstName: 'Lucía', lastName: 'Gómez', displayName: 'Lic. Lucía Gómez' };
              }
              return {
                ...p,
                displayName: p.displayName?.replace(/\s*DEMO/gi, '').trim() || p.displayName,
                lastName: p.lastName?.replace(/\s*DEMO/gi, '').trim() || p.lastName,
              };
            }
            return p;
          });

          const sanitizedState: PersistentDataState = {
            schemaVersion: CURRENT_SCHEMA_VERSION,
            patients: safePatients,
            professionals: cleanedProfessionals,
            appointments: safeAppointments,
            scheduleBlocks: Array.isArray(parsed.scheduleBlocks) ? parsed.scheduleBlocks : [],
            requests: safeRequests,
            auditLogs: safeAuditLogs,
            conversations: safeConversations,
            waitlist: safeWaitlist,
            slotOffers: Array.isArray(parsed.slotOffers) ? parsed.slotOffers : [],
            config: loadedConfig,
            decisionItems: safeDecisions,
            conversationSessions: parsed.conversationSessions && typeof parsed.conversationSessions === 'object' ? parsed.conversationSessions : {},
            patientDelayNotices: Array.isArray(parsed.patientDelayNotices) ? parsed.patientDelayNotices : [],
            clinicDelay: parsed.clinicDelay || null,
          };

          this.saveState(sanitizedState);
          return sanitizedState;
        }
      }
    } catch (e) {
      console.warn('PersistentStorageManager: error parsing storage, creating backup and restoring default DEMO state:', e);
      // Preserve backup
      try {
        const existingRaw = window.localStorage.getItem(STORAGE_KEY) || '';
        if (existingRaw) {
          window.localStorage.setItem('kineturnos_demo_recovery_backup', existingRaw);
        }
      } catch (backupErr) {
        // ignore
      }
      this.wasRestored = true;
    }

    this.saveState(defaultState);
    return defaultState;
  }

  public wasRestoredFromIncompatible(): boolean {
    return this.wasRestored;
  }

  public clearRestoredFlag(): void {
    this.wasRestored = false;
  }

  private saveState(state: PersistentDataState): void {
    this.state = state;
    if (this.isBrowser) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        console.warn('PersistentStorageManager: Error saving to localStorage:', e);
      }
    }
  }

  public getState(): PersistentDataState {
    return this.state;
  }

  public mutate(mutator: (state: PersistentDataState) => void): void {
    mutator(this.state);
    this.saveState(this.state);
  }

  public resetDemoData(): void {
    if (this.isBrowser) {
      try {
        const currentRaw = window.localStorage.getItem(STORAGE_KEY);
        if (currentRaw) {
          window.localStorage.setItem('kineturnos_demo_recovery_backup', currentRaw);
        }
      } catch (e) {
        // ignore
      }
    }
    const fresh = getDefaultDemoState();
    this.saveState(fresh);
  }
}

export const persistentStorageManager = new PersistentStorageManager();
