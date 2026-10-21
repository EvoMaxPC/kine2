import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { repositoryContainer } from '../repositories/RepositoryContainer.ts';
import { persistentStorageManager } from '../repositories/persistent/PersistentStorageManager.ts';
import { MockWhatsAppProvider } from '../integrations/whatsapp/MockWhatsAppProvider.ts';
import {
  AppointmentService,
  DaySlotViewModel,
  TodayOverviewSummary,
  SeriesSlotPreview,
  WaitingRoomPatient,
} from '../services/AppointmentService.ts';
import { AutomationEngine, AutomationExecutionLog } from '../services/AutomationEngine.ts';
import { SecretaryOrchestrator, SecretaryProcessResult } from '../services/SecretaryOrchestrator.ts';
import {
  Patient,
  Appointment,
  AppointmentRequest,
  RequestType,
  RequestStatus,
  AuditEvent,
  ConversationMessage,
  AppointmentStatus,
  ClinicConfig,
  DEFAULT_CLINIC_CONFIG,
  Professional,
  AppointmentType,
  DEFAULT_APPOINTMENT_TYPES,
  WaitlistEntry,
  DataMode,
  SeriesFrequency,
  DecisionItem,
  DecisionStatus,
  AutomationRule,
  AutomationLevel,
  AutomationEvent,
  AutomationEventType,
  ConversationSession,
} from '../types/index.ts';
import {
  getTodayDateString,
  addDays,
  buildIsoDateTime,
  formatHumanDate,
  formatTimeHs,
  parseTimeFromIso,
  parseDateFromIso,
  computeEndIso,
} from '../utils/dateUtils.ts';

export type ActiveNavTab =
  | 'hoy'
  | 'agenda'
  | 'decisiones'
  | 'solicitudes'
  | 'pacientes'
  | 'espera'
  | 'automatizaciones'
  | 'auditoria'
  | 'configuracion';

export type ThemeMode = 'light' | 'dark';
export type BootStatus = 'BOOTING' | 'READY' | 'ERROR';

export interface KineContextValue {
  bootStatus: BootStatus;
  bootError: string | null;
  activeTab: ActiveNavTab;
  setActiveTab: (tab: ActiveNavTab) => void;
  config: ClinicConfig;
  setConfig: React.Dispatch<React.SetStateAction<ClinicConfig>>;
  dataMode: DataMode;
  setDataMode: (mode: DataMode) => void;
  resetDemoData: () => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  selectedProfessionalId: string;
  setSelectedProfessionalId: (id: string) => void;
  professionals: Professional[];
  appointmentTypes: AppointmentType[];
  waitlistEntries: WaitlistEntry[];
  loading: boolean;
  todayOverview: TodayOverviewSummary | null;
  daySchedule: DaySlotViewModel[];
  allRequests: AppointmentRequest[];
  patients: Patient[];
  auditLogs: AuditEvent[];
  toastMessage: { text: string; type: 'success' | 'error' | 'info' } | null;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
  refreshAll: () => Promise<void>;
  approveRequest: (requestId: string) => Promise<boolean>;
  rejectRequest: (requestId: string, reason?: string) => Promise<boolean>;
  proposeAlternative: (
    requestId: string,
    altDate: string,
    altTime: string,
    altProfessionalId?: string
  ) => Promise<boolean>;
  createManualAppointment: (data: {
    patientId: string;
    professionalId: string;
    date: string;
    time: string;
    durationMinutes: number;
    appointmentTypeId?: string;
    notes?: string;
    resourceId?: string;
  }) => Promise<{ success: boolean; appointment?: Appointment; error?: string }>;
  updateAppointmentStatus: (appointmentId: string, status: AppointmentStatus) => Promise<boolean>;
  cancelAppointment: (appointmentId: string, reason?: string) => Promise<boolean>;
  createPatient: (data: Omit<Patient, 'id' | 'createdAt'>) => Promise<Patient | null>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<Patient | null>;
  getPatientAppointments: (patientId: string) => Promise<Appointment[]>;
  getPatientMessages: (patientId: string) => Promise<ConversationMessage[]>;
  sendDelayNotification: (
    appointmentIdOrMinutes: string | number,
    delayMinutesOrReason?: number | string
  ) => Promise<boolean>;
  executeFastReschedule: (
    appointmentId: string,
    targetDate: string,
    targetTime: string,
    professionalId?: string
  ) => Promise<boolean>;
  previewSeriesSlots: (
    startDate: string,
    time: string,
    frequency: SeriesFrequency,
    totalSessions: number,
    professionalId: string
  ) => Promise<SeriesSlotPreview[]>;
  createSeriesAppointments: (params: {
    patientId: string;
    professionalId: string;
    appointmentTypeId?: string;
    frequency: SeriesFrequency;
    totalSessions: number;
    confirmedSlots: SeriesSlotPreview[];
    notes?: string;
  }) => Promise<{ success: boolean; createdCount: number; errors?: string[] }>;
  rescheduleSeries: (
    seriesId: string,
    action: 'POSTPONE_FUTURE_1_WEEK' | 'CANCEL_FUTURE',
    reason?: string
  ) => Promise<boolean>;
  createWaitlistEntry: (data: {
    patientId: string;
    professionalId?: string;
    appointmentTypeId?: string;
    preferredDays: number[];
    preferredTimeRanges: { start: string; end: string }[];
    priority: 'NORMAL' | 'HIGH' | 'URGENT';
    notes?: string;
  }) => Promise<WaitlistEntry | null>;
  findWaitlistMatchesForSlot: (
    date: string,
    time: string,
    durationMinutes: number,
    professionalId: string
  ) => Promise<WaitlistEntry[]>;
  offerSlotToWaitlistPatient: (waitlistEntryId: string, slotStartIso: string) => Promise<boolean>;
  runAppointmentReminders: () => Promise<{ sentCount: number }>;
  checkPatientDuplicate: (firstName: string, lastName: string, phone: string) => Promise<any>;
  mergePatients: (sourcePatientId: string, targetPatientId: string) => Promise<boolean>;
  markPatientArrived: (appointmentId: string) => Promise<boolean>;
  startSession: (appointmentId: string) => Promise<boolean>;
  finishSession: (appointmentId: string) => Promise<boolean>;
  blockSlot: (
    startIso: string,
    endIso: string,
    reason?: string,
    professionalId?: string
  ) => Promise<boolean>;
  unblockSlot: (blockId: string) => Promise<boolean>;
  isWhatsAppDrawerOpen: boolean;
  setIsWhatsAppDrawerOpen: (open: boolean) => void;
  activeWhatsAppPatientId: string;
  setActiveWhatsAppPatientId: (id: string) => void;
  simulatePatientInboundMessage: (
    patientIdOrPhone: string,
    messageText: string,
    isAudio?: boolean,
    transcription?: string
  ) => Promise<SecretaryProcessResult | null>;
  theme: ThemeMode;
  toggleTheme: () => void;
  // Decision Center
  decisions: DecisionItem[];
  pendingDecisionsCount: number;
  resolveDecision: (
    id: string,
    actionType: string,
    payload?: Record<string, unknown>,
    notes?: string
  ) => Promise<boolean>;
  dismissDecision: (id: string, notes?: string) => Promise<boolean>;
  // Automation Engine
  automationRules: AutomationRule[];
  automationLogs: AutomationExecutionLog[];
  updateRuleLevel: (ruleId: string, level: AutomationLevel) => Promise<boolean>;
  toggleRuleEnabled: (ruleId: string, enabled: boolean) => Promise<boolean>;
  resetRulesToDefault: () => Promise<void>;
  emitAutomationEvent: (event: AutomationEvent) => Promise<AutomationExecutionLog[]>;
  // Modals
  isGlobalSearchOpen: boolean;
  setIsGlobalSearchOpen: (open: boolean) => void;
  isNewAppointmentModalOpen: boolean;
  setIsNewAppointmentModalOpen: (open: boolean) => void;
  newAppointmentInitialSlot: { date: string; time: string; professionalId?: string } | null;
  setNewAppointmentInitialSlot: (slot: { date: string; time: string; professionalId?: string } | null) => void;
  isNewPatientModalOpen: boolean;
  setIsNewPatientModalOpen: (open: boolean) => void;
  isBlockSlotModalOpen: boolean;
  setIsBlockSlotModalOpen: (open: boolean) => void;
  blockSlotInitialData: { date: string; time: string; professionalId?: string } | null;
  setBlockSlotInitialData: (data: { date: string; time: string; professionalId?: string } | null) => void;
  isWaitlistModalOpen: boolean;
  setIsWaitlistModalOpen: (open: boolean) => void;
  isSeriesModalOpen: boolean;
  setIsSeriesModalOpen: (open: boolean) => void;
  isDelayModalOpen: boolean;
  setIsDelayModalOpen: (open: boolean) => void;
  delayTargetAppointment: Appointment | null;
  setDelayTargetAppointment: (apt: Appointment | null) => void;
  isFastRescheduleModalOpen: boolean;
  setIsFastRescheduleModalOpen: (open: boolean) => void;
  fastRescheduleTargetAppointment: Appointment | null;
  setFastRescheduleTargetAppointment: (apt: Appointment | null) => void;
  isResetConfirmModalOpen: boolean;
  setIsResetConfirmModalOpen: (open: boolean) => void;
  // Alerta con Sonido al Kinesiólogo para Decisión de Turno
  activeKineAlert: AppointmentRequest | null;
  setActiveKineAlert: (req: AppointmentRequest | null) => void;
  confirmAlertRequest: (req: AppointmentRequest) => Promise<boolean>;
}

export const KineContext = createContext<KineContextValue | null>(null);

export const KineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bootStatus, setBootStatus] = useState<BootStatus>('BOOTING');
  const [bootError, setBootError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveNavTab>('hoy');
  const [config, setConfig] = useState<ClinicConfig>(DEFAULT_CLINIC_CONFIG);
  const [dataMode, setDataModeState] = useState<DataMode>(() => repositoryContainer.getDataMode());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());
  const [activeKineAlert, setActiveKineAlert] = useState<AppointmentRequest | null>(null);
  const seenAlertIdsRef = React.useRef<Set<string>>(new Set());
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Theme mode
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kineturnos_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
      localStorage.setItem('kineturnos_theme', theme);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Drawer / Modals
  const [isWhatsAppDrawerOpen, setIsWhatsAppDrawerOpen] = useState<boolean>(false);
  const [activeWhatsAppPatientId, setActiveWhatsAppPatientId] = useState<string>('pat_demo_1');
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [isNewAppointmentModalOpen, setIsNewAppointmentModalOpen] = useState<boolean>(false);
  const [newAppointmentInitialSlot, setNewAppointmentInitialSlot] = useState<{ date: string; time: string; professionalId?: string } | null>(null);
  const [isNewPatientModalOpen, setIsNewPatientModalOpen] = useState<boolean>(false);
  const [isBlockSlotModalOpen, setIsBlockSlotModalOpen] = useState<boolean>(false);
  const [blockSlotInitialData, setBlockSlotInitialData] = useState<{ date: string; time: string; professionalId?: string } | null>(null);
  const [isWaitlistModalOpen, setIsWaitlistModalOpen] = useState<boolean>(false);
  const [isSeriesModalOpen, setIsSeriesModalOpen] = useState<boolean>(false);
  const [isDelayModalOpen, setIsDelayModalOpen] = useState<boolean>(false);
  const [delayTargetAppointment, setDelayTargetAppointment] = useState<Appointment | null>(null);
  const [isFastRescheduleModalOpen, setIsFastRescheduleModalOpen] = useState<boolean>(false);
  const [fastRescheduleTargetAppointment, setFastRescheduleTargetAppointment] = useState<Appointment | null>(null);
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState<boolean>(false);

  // Dynamic Repositories
  const repos = useMemo(() => repositoryContainer.getRepositories(), [dataMode]);
  const whatsappProvider = useMemo(() => new MockWhatsAppProvider(repos.conversationRepo), [repos]);

  const appointmentService = useMemo(
    () =>
      new AppointmentService(
        repos.appointmentRepo,
        repos.patientRepo,
        repos.requestRepo,
        repos.auditRepo,
        repos.conversationRepo,
        whatsappProvider,
        config,
        repos.waitlistRepo,
        repos.professionalRepo
      ),
    [repos, whatsappProvider, config]
  );

  const secretaryOrchestrator = useMemo(
    () =>
      new SecretaryOrchestrator(
        repos.patientRepo,
        repos.appointmentRepo,
        repos.conversationRepo,
        repos.conversationSessionRepo,
        repos.waitlistRepo,
        repos.decisionRepo,
        appointmentService,
        whatsappProvider,
        config
      ),
    [repos, appointmentService, whatsappProvider, config]
  );

  const automationEngine = useMemo(() => {
    const engine = new AutomationEngine(
      repos.automationRuleRepo,
      repos.waitlistRepo,
      repos.appointmentRepo,
      repos.patientRepo,
      repos.decisionRepo,
      repos.auditRepo,
      repos.conversationSessionRepo,
      whatsappProvider,
      secretaryOrchestrator
    );
    secretaryOrchestrator.setAutomationEngine(engine);
    return engine;
  }, [repos, whatsappProvider, secretaryOrchestrator]);

  // Data states
  const [todayOverview, setTodayOverview] = useState<TodayOverviewSummary | null>(null);
  const [daySchedule, setDaySchedule] = useState<DaySlotViewModel[]>([]);
  const [allRequests, setAllRequests] = useState<AppointmentRequest[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointmentTypes] = useState<AppointmentType[]>(DEFAULT_APPOINTMENT_TYPES);
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>([]);
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([]);
  const [automationLogs, setAutomationLogs] = useState<AutomationExecutionLog[]>([]);

  // Toast
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      const profIdFilter = selectedProfessionalId === 'ALL' ? undefined : selectedProfessionalId;
      const [overview, schedule, reqs, pats, profs, waitlist, audits, decs, rules] = await Promise.all([
        appointmentService.getTodayOverview(profIdFilter),
        appointmentService.getDaySchedule(selectedDate, profIdFilter),
        repos.requestRepo.getAllRequests(),
        repos.patientRepo.getAllPatients(),
        repos.professionalRepo.getAllProfessionals(),
        repos.waitlistRepo.getActiveEntries(),
        repos.auditRepo.getRecentEvents(100),
        repos.decisionRepo.getAllDecisions(),
        repos.automationRuleRepo.getRules(),
      ]);

      setTodayOverview(overview);
      setDaySchedule(schedule);
      setAllRequests(reqs);
      setPatients(pats);
      setProfessionals(profs);
      setWaitlistEntries(waitlist);
      setAuditLogs(audits);
      setDecisions(decs);
      setAutomationRules(rules);
      setAutomationLogs(automationEngine.getExecutionHistory());
      setLoading(false);
      setBootStatus('READY');
    } catch (err) {
      console.error('Error refreshing KineTurnos data:', err);
      setBootError(err instanceof Error ? err.message : 'Error al inicializar datos');
      setLoading(false);
      setBootStatus('READY');
    }
  }, [
    appointmentService,
    repos,
    automationEngine,
    selectedDate,
    selectedProfessionalId,
  ]);

  // Safety boot timeout so UI never hangs indefinitely
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
      setBootStatus((prev) => (prev === 'BOOTING' ? 'READY' : prev));
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    refreshAll();
    if (persistentStorageManager.wasRestoredFromIncompatible()) {
      showToast('Los datos anteriores eran incompatibles y fueron restaurados.', 'info');
      persistentStorageManager.clearRestoredFlag();
    }
  }, [refreshAll, refreshTrigger, showToast]);

  // Subscribe to real-time automation events
  useEffect(() => {
    const unsubscribe = automationEngine.subscribe((event, log) => {
      setAutomationLogs(automationEngine.getExecutionHistory());
      // If a decision was created, refresh decisions
      if (log.status === 'QUEUED_FOR_DECISION') {
        repos.decisionRepo.getAllDecisions().then(setDecisions);
      }
    });
    return unsubscribe;
  }, [automationEngine, repos]);

  const setDataMode = (mode: DataMode) => {
    repositoryContainer.setDataMode(mode);
    setDataModeState(mode);
    showToast(`Modo cambiado a: ${mode}`, 'info');
    setRefreshTrigger((prev) => prev + 1);
  };

  const resetDemoData = () => {
    repositoryContainer.resetDemoData();
    showToast('Consultorio reiniciado a los datos de prueba base', 'info');
    setIsResetConfirmModalOpen(false);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Decisions
  const pendingDecisionsCount = useMemo(
    () => decisions.filter((d) => d.status === 'PENDING').length,
    [decisions]
  );

  const resolveDecision = async (
    id: string,
    actionType: string,
    payload?: Record<string, unknown>,
    notes?: string
  ): Promise<boolean> => {
    try {
      const decision = await repos.decisionRepo.getDecisionById(id);
      if (!decision) return false;

      // Execute proposed action
      if (actionType === 'RESCHEDULE' && payload) {
        const { date, time, professionalId } = payload as { date: string; time: string; professionalId?: string };
        if (decision.appointmentId && date && time) {
          const startIso = buildIsoDateTime(date, time);
          const endIso = computeEndIso(startIso, 45);
          await appointmentService.fastRescheduleAppointment(
            decision.appointmentId,
            startIso,
            endIso
          );
        }
      } else if (actionType === 'OFFER_WAITLIST' && payload) {
        const { candidateId, startIso } = payload as { candidateId: string; startIso: string };
        if (candidateId && startIso) {
          const endIso = computeEndIso(startIso, 45);
          await appointmentService.offerSlotToWaitlistPatient(candidateId, {
            professionalId: 'prof_demo_1',
            startAt: startIso,
            endAt: endIso,
            durationMinutes: 45,
          });
        }
      } else if (actionType === 'MARK_NO_SHOW' && decision.appointmentId) {
        await appointmentService.updateStatus(decision.appointmentId, AppointmentStatus.NO_SHOW);
      }

      await repos.decisionRepo.updateDecisionStatus(id, 'ACCEPTED', notes || 'Aceptado por profesional');

      await repos.auditRepo.recordEvent({
        actorType: 'STAFF',
        action: 'DECISION_RESOLVED',
        entityType: 'APPOINTMENT',
        entityId: id,
        description: `Decisión "${decision.title}" resuelta con acción: ${actionType}.`,
      });

      showToast(`Propuesta aceptada con éxito: ${decision.title}`, 'success');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } catch (err: unknown) {
      showToast('Error al resolver la decisión.', 'error');
      return false;
    }
  };

  const dismissDecision = async (id: string, notes?: string): Promise<boolean> => {
    try {
      await repos.decisionRepo.updateDecisionStatus(id, 'REJECTED', notes || 'Descartado por profesional');
      showToast('Decisión descartada', 'info');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } catch (err) {
      showToast('Error al descartar la decisión.', 'error');
      return false;
    }
  };

  // Automation rules controls
  const updateRuleLevel = async (ruleId: string, level: AutomationLevel): Promise<boolean> => {
    try {
      await repos.automationRuleRepo.setRuleLevel(ruleId, level);
      showToast(`Nivel de autonomía actualizado a: ${level}`, 'success');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } catch (err) {
      showToast('Error al modificar nivel de regla.', 'error');
      return false;
    }
  };

  const toggleRuleEnabled = async (ruleId: string, enabled: boolean): Promise<boolean> => {
    try {
      await repos.automationRuleRepo.toggleRuleEnabled(ruleId, enabled);
      showToast(enabled ? 'Regla activada' : 'Regla pausada', 'info');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } catch (err) {
      return false;
    }
  };

  const resetRulesToDefault = async (): Promise<void> => {
    await repos.automationRuleRepo.resetToDefaults();
    showToast('Reglas restablecidas a los valores de fábrica', 'info');
    setRefreshTrigger((prev) => prev + 1);
  };

  const emitAutomationEvent = async (event: AutomationEvent) => {
    const logs = await automationEngine.emit(event);
    setRefreshTrigger((prev) => prev + 1);
    return logs;
  };

  // Simulator helper: routes through SecretaryOrchestrator and AutomationEngine
  const simulatePatientInboundMessage = async (
    patientIdOrPhone: string,
    messageText: string,
    isAudio?: boolean,
    transcription?: string
  ): Promise<SecretaryProcessResult | null> => {
    try {
      // Find patient or assume phone number
      const pat = patients.find((p) => p.id === patientIdOrPhone || p.phone === patientIdOrPhone);
      const phone = pat ? pat.phone : patientIdOrPhone;

      const result = await secretaryOrchestrator.processInboundMessage({
        phoneNumber: phone,
        messageText,
        isAudio,
        transcription,
      });

      showToast(`Mensaje procesado por Secretaria Virtual · Intención: ${result.intent}`, 'info');
      setRefreshTrigger((prev) => prev + 1);
      return result;
    } catch (err: unknown) {
      console.error('Error in simulatePatientInboundMessage:', err);
      showToast('Error al simular mensaje de WhatsApp.', 'error');
      return null;
    }
  };

  // Wrapped actions
  const approveRequest = async (requestId: string) => {
    const res = await appointmentService.approveRequest(requestId);
    if (res.success) {
      showToast('Solicitud aprobada y confirmada en agenda', 'success');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } else {
      showToast(res.error || 'Error al aprobar solicitud.', 'error');
      return false;
    }
  };

  const confirmAlertRequest = async (req: AppointmentRequest): Promise<boolean> => {
    try {
      const serverRes = await fetch(`/api/kine/requests/${req.id}/confirm`, {
        method: 'POST',
      });
      if (serverRes.ok) {
        const data = await serverRes.json();
        if (data.success) {
          showToast(`✅ Turno confirmado y WhatsApp real enviado al paciente (SID: ${data.messageId || 'OK'})`, 'success');
          setActiveKineAlert(null);
          setRefreshTrigger((prev) => prev + 1);
          return true;
        }
      }
    } catch (err) {
      console.warn('Backend server confirm fallback:', err);
    }

    // Local / repository confirmation fallback
    const ok = await approveRequest(req.id);
    if (ok) {
      try {
        await fetch('/api/twilio/whatsapp/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: req.patientPhone,
            text: `¡Hola ${req.patientName?.split(' ')[0]}! Tu turno del ${req.preferredDate} a las ${req.preferredTime} hs ha sido confirmado con el kinesiólogo. El valor de la sesión es de $${(config.consultationFee || 15000).toLocaleString('es-AR')}. Te esperamos en ${config.clinicName}.`,
          }),
        });
      } catch {}
      setActiveKineAlert(null);
      setRefreshTrigger((prev) => prev + 1);
      return true;
    }
    return false;
  };

  // Polling para detectar alertas de WhatsApp en tiempo real
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/kine/pending-alerts');
        if (res.ok) {
          const data = await res.json();
          if (data.alerts && data.alerts.length > 0) {
            const firstUnseen = data.alerts.find((a: any) => !seenAlertIdsRef.current.has(a.id));
            if (firstUnseen) {
              seenAlertIdsRef.current.add(firstUnseen.id);
              const mappedReq: AppointmentRequest = {
                id: firstUnseen.requestId,
                patientId: 'pat_real',
                professionalId: 'prof_demo_1',
                patientName: firstUnseen.patientName,
                patientPhone: firstUnseen.patientPhone,
                patientMessage: firstUnseen.originalMessage || firstUnseen.whatRequested || 'Solicitud de turno por WhatsApp',
                type: RequestType.NEW,
                preferredDate: firstUnseen.chosenDate,
                preferredTime: firstUnseen.chosenTime,
                suggestedStartIso: `${firstUnseen.chosenDate}T${firstUnseen.chosenTime}:00`,
                suggestedEndIso: `${firstUnseen.chosenDate}T${firstUnseen.chosenTime}:45`,
                status: RequestStatus.PENDING,
                administrativeNotes: firstUnseen.whatRequested,
                originalMessage: firstUnseen.originalMessage,
                source: 'WHATSAPP_TWILIO',
                createdAt: firstUnseen.createdAt,
              };
              setActiveKineAlert(mappedReq);
            }
          }
        }
      } catch {}
    }, 3500);

    return () => clearInterval(pollInterval);
  }, []);

  const rejectRequest = async (requestId: string, reason?: string) => {
    const res = await appointmentService.rejectRequest(requestId, reason || 'Rechazado por el profesional');
    if (res.success) {
      showToast('Solicitud rechazada', 'info');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } else {
      showToast(res.error || 'Error al rechazar solicitud.', 'error');
      return false;
    }
  };

  const proposeAlternative = async (
    requestId: string,
    altDate: string,
    altTime: string,
    altProfessionalId?: string
  ) => {
    const res = await appointmentService.proposeAlternative(requestId, altDate, altTime, altProfessionalId);
    if (res.success) {
      showToast('Propuesta alternativa enviada al paciente por WhatsApp', 'success');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } else {
      showToast(res.error || 'Horario no disponible.', 'error');
      return false;
    }
  };

  const createManualAppointment = async (data: {
    patientId: string;
    professionalId: string;
    date: string;
    time: string;
    durationMinutes: number;
    appointmentTypeId?: string;
    notes?: string;
    resourceId?: string;
  }) => {
    const startIso = buildIsoDateTime(data.date, data.time);
    const endIso = computeEndIso(startIso, data.durationMinutes);
    const result = await appointmentService.createManualAppointment({
      patientId: data.patientId,
      professionalId: data.professionalId,
      startAt: startIso,
      endAt: endIso,
      durationMinutes: data.durationMinutes,
      appointmentTypeId: data.appointmentTypeId,
      resourceId: data.resourceId,
      administrativeNotes: data.notes,
    });
    if (result.success) {
      showToast('Turno agendado correctamente', 'success');
      setIsNewAppointmentModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
      return { success: true, appointment: result.appointment };
    } else {
      showToast(result.error || 'Conflicto de horario.', 'error');
      return { success: false, error: result.error };
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, status: AppointmentStatus) => {
    try {
      await appointmentService.updateStatus(appointmentId, status);
      const statusLabels: Record<AppointmentStatus, string> = {
        [AppointmentStatus.COMPLETED]: 'Atendido',
        [AppointmentStatus.NO_SHOW]: 'Ausente',
        [AppointmentStatus.CONFIRMED]: 'Confirmado',
        [AppointmentStatus.PENDING_APPROVAL]: 'Pendiente',
        [AppointmentStatus.REQUESTED]: 'Solicitado',
        [AppointmentStatus.CANCELLED]: 'Cancelado',
        [AppointmentStatus.CANCEL_PENDING]: 'Cancelación pendiente',
        [AppointmentStatus.CHANGE_PENDING]: 'Cambio pendiente',
      };
      showToast(`Turno marcado como ${statusLabels[status] || status}`, 'success');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } catch (err) {
      showToast('No se pudo actualizar el estado.', 'error');
      return false;
    }
  };

  const cancelAppointment = async (appointmentId: string, reason?: string) => {
    try {
      const app = await repos.appointmentRepo.getAppointmentById(appointmentId);
      await repos.appointmentRepo.cancelAppointment(appointmentId, reason);

      await repos.auditRepo.recordEvent({
        actorType: 'STAFF',
        action: 'TURNO_CANCELADO',
        entityType: 'APPOINTMENT',
        entityId: appointmentId,
        description: `Turno ${appointmentId} cancelado por el profesional/recepción.`,
      });

      // Emit APPOINTMENT_CANCELLED & SLOT_RELEASED into AutomationEngine
      if (app) {
        await automationEngine.emit({
          id: `evt_canc_${Date.now()}`,
          type: AutomationEventType.APPOINTMENT_CANCELLED,
          timestamp: new Date().toISOString(),
          source: 'PROFESSIONAL',
          payload: {
            appointmentId: app.id,
            patientId: app.patientId,
            professionalId: app.professionalId,
            startIso: app.startAt,
            endIso: app.endAt,
            reason: reason || 'Cancelado por recepción',
          },
        });

        const appDate = parseDateFromIso(app.startAt);
        const appTime = parseTimeFromIso(app.startAt);
        await automationEngine.emit({
          id: `evt_slot_${Date.now()}`,
          type: AutomationEventType.SLOT_RELEASED,
          timestamp: new Date().toISOString(),
          source: 'SYSTEM',
          payload: {
            date: appDate,
            time: appTime,
            startIso: app.startAt,
            endIso: app.endAt,
            professionalId: app.professionalId,
            releasedByAppointmentId: app.id,
            reason: 'Turno cancelado',
          },
        });
      }

      showToast('Turno cancelado · Auto-relleno de lista de espera evaluado', 'info');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } catch (err) {
      showToast('No se pudo cancelar el turno.', 'error');
      return false;
    }
  };

  const createPatient = async (data: Omit<Patient, 'id' | 'createdAt'>) => {
    try {
      const newPatient = await repos.patientRepo.createPatient(data);
      await repos.auditRepo.recordEvent({
        actorType: 'STAFF',
        action: 'PACIENTE_CREADO',
        entityType: 'PATIENT',
        entityId: newPatient.id,
        description: `Alta administrativa de ${newPatient.firstName} ${newPatient.lastName}.`,
      });
      showToast('Paciente registrado correctamente', 'success');
      setIsNewPatientModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
      return newPatient;
    } catch (err) {
      showToast('Error al registrar paciente.', 'error');
      return null;
    }
  };

  const updatePatient = async (id: string, updates: Partial<Patient>) => {
    try {
      const updated = await repos.patientRepo.updatePatient(id, updates);
      await repos.auditRepo.recordEvent({
        actorType: 'STAFF',
        action: 'PACIENTE_ACTUALIZADO',
        entityType: 'PATIENT',
        entityId: id,
        description: `Modificación de datos de ${updated.firstName} ${updated.lastName}.`,
      });
      showToast('Datos de paciente actualizados correctamente', 'success');
      setRefreshTrigger((prev) => prev + 1);
      return updated;
    } catch (err) {
      showToast('Error al actualizar datos del paciente.', 'error');
      return null;
    }
  };

  const getPatientAppointments = async (patientId: string) => {
    return repos.appointmentRepo.getPatientActiveAppointments(patientId);
  };

  const getPatientMessages = async (patientId: string) => {
    return repos.conversationRepo.getMessagesByPatientId(patientId);
  };

  const sendDelayNotification = async (appointmentIdOrMinutes: string | number, delayMinutesOrReason?: number | string) => {
    if (typeof appointmentIdOrMinutes === 'string') {
      const appointmentId = appointmentIdOrMinutes;
      const minutes = typeof delayMinutesOrReason === 'number' ? delayMinutesOrReason : 10;
      const app = await repos.appointmentRepo.getAppointmentById(appointmentId);
      if (app) {
        const patient = await repos.patientRepo.getPatientById(app.patientId);
        const note = `Avisó demora (+${minutes} min)`;
        await repos.appointmentRepo.updateAppointment(appointmentId, {
          administrativeNotes: app.administrativeNotes ? `${app.administrativeNotes} · ${note}` : note,
        });
        if (patient?.whatsappPhone) {
          const msg = `Hola ${patient.firstName}. Te informamos que tenemos una demora estimada de ${minutes} min en el consultorio. Te esperamos a partir de ese horario.`;
          await whatsappProvider.sendMessage(patient.whatsappPhone, msg);
        }
        showToast(`Demora de ${minutes} min notificada a ${patient?.firstName || 'paciente'}`, 'success');
        setRefreshTrigger((prev) => prev + 1);
        return true;
      }
      return false;
    } else {
      const delayMinutes = appointmentIdOrMinutes;
      const todayApps = await repos.appointmentRepo.getTodayAppointments(selectedProfessionalId === 'ALL' ? undefined : selectedProfessionalId);
      const upcoming = todayApps.filter((a) => a.status === AppointmentStatus.CONFIRMED && !a.completedAt);
      for (const a of upcoming) {
        const p = await repos.patientRepo.getPatientById(a.patientId);
        if (p?.whatsappPhone) {
          const time = formatTimeHs(parseTimeFromIso(a.startAt));
          const msg = `Hola ${p.firstName}. Te informamos que tenemos una demora de ${delayMinutes} min respecto a tu turno de las ${time} hs.`;
          await whatsappProvider.sendMessage(p.whatsappPhone, msg);
        }
      }
      showToast(`Demora de ${delayMinutes} min informada a ${upcoming.length} pacientes`, 'success');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    }
  };

  const executeFastReschedule = async (
    appointmentId: string,
    targetDate: string,
    targetTime: string,
    professionalId?: string
  ) => {
    const startIso = buildIsoDateTime(targetDate, targetTime);
    const endIso = computeEndIso(startIso, 45);
    const result = await appointmentService.fastRescheduleAppointment(
      appointmentId,
      startIso,
      endIso
    );
    if (result.success) {
      showToast('Turno reprogramado exitosamente', 'success');
      setIsFastRescheduleModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } else {
      showToast(result.error || 'Horario no disponible para reprogramar.', 'error');
      return false;
    }
  };

  const previewSeriesSlots = async (
    startDate: string,
    time: string,
    frequency: SeriesFrequency,
    totalSessions: number,
    professionalId: string
  ) => {
    const baseDate = new Date(`${startDate}T12:00:00`);
    const dayOfWeek = baseDate.getDay();
    const res = await appointmentService.previewSeriesSlots({
      patientId: 'temp',
      professionalId,
      startDate,
      totalWeeks: totalSessions,
      daysOfWeek: [dayOfWeek],
      timeSlots: { [dayOfWeek]: time },
      durationMinutes: 45,
    });
    return res.slots;
  };

  const createSeriesAppointments = async (params: {
    patientId: string;
    professionalId: string;
    appointmentTypeId?: string;
    frequency: SeriesFrequency;
    totalSessions: number;
    confirmedSlots: SeriesSlotPreview[];
    notes?: string;
  }) => {
    const baseDate = params.confirmedSlots[0] ? new Date(`${params.confirmedSlots[0].date}T12:00:00`) : new Date();
    const dayOfWeek = baseDate.getDay();
    const result = await appointmentService.createSeriesAppointments({
      patientId: params.patientId,
      professionalId: params.professionalId,
      appointmentTypeId: params.appointmentTypeId,
      frequency: params.frequency,
      daysOfWeek: [dayOfWeek],
      timeSlots: { [dayOfWeek]: params.confirmedSlots[0]?.time || '09:00' },
      slotsToCreate: params.confirmedSlots.map((s) => ({ startIso: s.startIso, endIso: s.endIso })),
      administrativeNotes: params.notes,
    });
    if (result.createdAppointments.length > 0) {
      showToast(`Tratamiento de ${result.createdAppointments.length} sesiones agendado`, 'success');
      setIsSeriesModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
      return { success: true, createdCount: result.createdAppointments.length };
    } else {
      showToast('Hubo conflictos al generar la serie de turnos.', 'error');
      return { success: false, createdCount: 0 };
    }
  };

  const rescheduleSeries = async (
    seriesId: string,
    action: 'POSTPONE_FUTURE_1_WEEK' | 'CANCEL_FUTURE',
    reason?: string
  ) => {
    const todayApps = await repos.appointmentRepo.getTodayAppointments();
    const target = todayApps.find((a) => a.seriesId === seriesId);
    if (!target) return false;
    const newStart = addDays(target.startAt.slice(0, 10), 7) + target.startAt.slice(10);
    const newEnd = addDays(target.endAt.slice(0, 10), 7) + target.endAt.slice(10);
    const result = await appointmentService.rescheduleSeries(target.id, newStart, newEnd, true);
    if (result.success) {
      showToast('Serie de turnos actualizada correctamente', 'success');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } else {
      showToast(result.error || 'Error al modificar serie.', 'error');
      return false;
    }
  };

  const createWaitlistEntry = async (data: {
    patientId: string;
    professionalId?: string;
    appointmentTypeId?: string;
    preferredDays: number[];
    preferredTimeRanges: { start: string; end: string }[];
    priority: 'NORMAL' | 'HIGH' | 'URGENT';
    notes?: string;
  }) => {
    const entry = await repos.waitlistRepo.createWaitlistEntry({
      ...data,
      status: 'ACTIVE',
    });
    await repos.auditRepo.recordEvent({
      actorType: 'STAFF',
      action: 'LISTA_ESPERA_ALTA',
      entityType: 'APPOINTMENT',
      entityId: entry.id,
      description: `Paciente ingresado a lista de espera con prioridad ${entry.priority}.`,
    });
    showToast('Paciente añadido a Lista de Espera', 'success');
    setIsWaitlistModalOpen(false);
    setRefreshTrigger((prev) => prev + 1);
    return entry;
  };

  const findWaitlistMatchesForSlot = async (
    date: string,
    time: string,
    durationMinutes: number,
    professionalId: string
  ) => {
    const startIso = buildIsoDateTime(date, time);
    const endIso = computeEndIso(startIso, durationMinutes);
    return appointmentService.findWaitlistMatchesForSlot({
      professionalId,
      startAt: startIso,
      endAt: endIso,
    });
  };

  const offerSlotToWaitlistPatient = async (waitlistEntryId: string, slotStartIso: string) => {
    const endIso = computeEndIso(slotStartIso, 45);
    const res = await appointmentService.offerSlotToWaitlistPatient(waitlistEntryId, {
      professionalId: selectedProfessionalId === 'ALL' ? 'prof_demo_1' : selectedProfessionalId,
      startAt: slotStartIso,
      endAt: endIso,
      durationMinutes: 45,
    });
    if (res.success) {
      showToast('Oferta enviada al paciente por WhatsApp (30 min de validez)', 'success');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } else {
      showToast(res.error || 'No se pudo generar la oferta.', 'error');
      return false;
    }
  };

  const runAppointmentReminders = async () => {
    const result = await appointmentService.runAppointmentReminders();
    showToast(`Recordatorios enviados a ${result.remindersSentCount} pacientes`, 'success');
    setRefreshTrigger((prev) => prev + 1);
    return { sentCount: result.remindersSentCount };
  };

  const checkPatientDuplicate = async (firstName: string, lastName: string, phone: string) => {
    return appointmentService.checkPatientDuplicate({ firstName, lastName, phone });
  };

  const mergePatients = async (sourcePatientId: string, targetPatientId: string) => {
    const result = await appointmentService.mergePatients(sourcePatientId, targetPatientId);
    if (result.success) {
      showToast('Fichas de paciente unificadas correctamente', 'success');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } else {
      showToast(result.error || 'Error al unificar pacientes.', 'error');
      return false;
    }
  };

  const markPatientArrived = async (appointmentId: string) => {
    const ok = await appointmentService.markPatientArrived(appointmentId);
    if (ok) {
      showToast('Paciente ingresado a Sala de Espera Digital', 'success');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    }
    return false;
  };

  const startSession = async (appointmentId: string) => {
    const ok = await appointmentService.startSession(appointmentId);
    if (ok) {
      showToast('Sesión de kinesiología iniciada', 'success');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    }
    return false;
  };

  const finishSession = async (appointmentId: string) => {
    const ok = await appointmentService.finishSession(appointmentId);
    if (ok) {
      showToast('Sesión completada exitosamente', 'success');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    }
    return false;
  };

  const blockSlot = async (
    startIso: string,
    endIso: string,
    reason?: string,
    professionalId: string = 'prof_demo_1'
  ) => {
    const result = await appointmentService.createScheduleBlock({
      professionalId,
      startAt: startIso,
      endAt: endIso,
      reason: reason || 'Almuerzo / Receso',
    });
    if (result.success) {
      showToast('Horario bloqueado en agenda', 'success');
      setIsBlockSlotModalOpen(false);
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } else {
      showToast(result.error || 'No se pudo bloquear el horario', 'error');
      return false;
    }
  };

  const unblockSlot = async (blockId: string) => {
    try {
      await appointmentService.removeScheduleBlock(blockId);
      showToast('Horario desbloqueado', 'success');
      setRefreshTrigger((prev) => prev + 1);
      return true;
    } catch (err) {
      return false;
    }
  };

  const value: KineContextValue = {
    bootStatus,
    bootError,
    activeTab,
    setActiveTab,
    config,
    setConfig,
    dataMode,
    setDataMode,
    resetDemoData,
    selectedDate,
    setSelectedDate,
    selectedProfessionalId,
    setSelectedProfessionalId,
    professionals,
    appointmentTypes,
    waitlistEntries,
    loading,
    todayOverview,
    daySchedule,
    allRequests,
    patients,
    auditLogs,
    toastMessage,
    showToast,
    refreshAll,
    approveRequest,
    rejectRequest,
    proposeAlternative,
    createManualAppointment,
    updateAppointmentStatus,
    cancelAppointment,
    createPatient,
    updatePatient,
    getPatientAppointments,
    getPatientMessages,
    sendDelayNotification,
    executeFastReschedule,
    previewSeriesSlots,
    createSeriesAppointments,
    rescheduleSeries,
    createWaitlistEntry,
    findWaitlistMatchesForSlot,
    offerSlotToWaitlistPatient,
    runAppointmentReminders,
    checkPatientDuplicate,
    mergePatients,
    markPatientArrived,
    startSession,
    finishSession,
    blockSlot,
    unblockSlot,
    isWhatsAppDrawerOpen,
    setIsWhatsAppDrawerOpen,
    activeWhatsAppPatientId,
    setActiveWhatsAppPatientId,
    simulatePatientInboundMessage,
    theme,
    toggleTheme,
    decisions,
    pendingDecisionsCount,
    resolveDecision,
    dismissDecision,
    automationRules,
    automationLogs,
    updateRuleLevel,
    toggleRuleEnabled,
    resetRulesToDefault,
    emitAutomationEvent,
    isGlobalSearchOpen,
    setIsGlobalSearchOpen,
    isNewAppointmentModalOpen,
    setIsNewAppointmentModalOpen,
    newAppointmentInitialSlot,
    setNewAppointmentInitialSlot,
    isNewPatientModalOpen,
    setIsNewPatientModalOpen,
    isBlockSlotModalOpen,
    setIsBlockSlotModalOpen,
    blockSlotInitialData,
    setBlockSlotInitialData,
    isWaitlistModalOpen,
    setIsWaitlistModalOpen,
    isSeriesModalOpen,
    setIsSeriesModalOpen,
    isDelayModalOpen,
    setIsDelayModalOpen,
    delayTargetAppointment,
    setDelayTargetAppointment,
    isFastRescheduleModalOpen,
    setIsFastRescheduleModalOpen,
    fastRescheduleTargetAppointment,
    setFastRescheduleTargetAppointment,
    isResetConfirmModalOpen,
    setIsResetConfirmModalOpen,
    activeKineAlert,
    setActiveKineAlert,
    confirmAlertRequest,
  };

  return <KineContext.Provider value={value}>{children}</KineContext.Provider>;
};
