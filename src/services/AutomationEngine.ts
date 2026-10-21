/**
 * @file AutomationEngine.ts
 * @description Motor central de automatización reactiva y autónoma para KineTurnos.
 * Arquitectura: EVENTO -> REGLAS -> DECISIÓN -> ACCIÓN -> AUDITORÍA -> NOTIFICACIÓN.
 */

import {
  AutomationEvent,
  AutomationEventType,
  AutomationRule,
  AutomationLevel,
  AutomationActionResult,
  DecisionItem,
  ClinicConfig,
  DEFAULT_CLINIC_CONFIG,
  AppointmentStatus,
  SlotOffer,
} from '../types/index.ts';
import { IAutomationRuleRepository } from '../repositories/IAutomationRuleRepository.ts';
import { IAppointmentRepository } from '../repositories/IAppointmentRepository.ts';
import { IPatientRepository } from '../repositories/IPatientRepository.ts';
import { IAuditRepository } from '../repositories/IAuditRepository.ts';
import { IWaitlistRepository } from '../repositories/IWaitlistRepository.ts';
import { IDecisionRepository } from '../repositories/IDecisionRepository.ts';
import { IConversationSessionRepository } from '../repositories/IConversationSessionRepository.ts';
import { IWhatsAppProvider } from '../integrations/whatsapp/IWhatsAppProvider.ts';
import { formatHumanDate, formatTimeHs, parseDateFromIso, parseTimeFromIso } from '../utils/dateUtils.ts';
import type { SecretaryOrchestrator } from './SecretaryOrchestrator.ts';

export interface AutomationExecutionLog {
  id: string;
  eventId: string;
  eventType: AutomationEventType;
  ruleId: string;
  ruleName: string;
  level: AutomationLevel;
  status: 'EXECUTED' | 'QUEUED_FOR_DECISION' | 'SKIPPED' | 'FAILED';
  actionTaken: string;
  timestamp: string;
  details?: string;
  payload?: any;
}

export type AutomationEventListener = (event: AutomationEvent, log: AutomationExecutionLog) => void;

export class AutomationEngine {
  private listeners: Set<AutomationEventListener> = new Set();
  private eventHistory: AutomationEvent[] = [];
  private executionHistory: AutomationExecutionLog[] = [];
  private config: ClinicConfig = DEFAULT_CLINIC_CONFIG;

  constructor(
    private ruleRepo: IAutomationRuleRepository,
    private waitlistRepo: IWaitlistRepository,
    private appointmentRepo: IAppointmentRepository,
    private patientRepo: IPatientRepository,
    private decisionRepo: IDecisionRepository,
    private auditRepo: IAuditRepository,
    private sessionRepo: IConversationSessionRepository,
    private whatsappProvider: IWhatsAppProvider,
    private secretaryOrchestrator?: SecretaryOrchestrator
  ) {}

  public setSecretaryOrchestrator(orchestrator: SecretaryOrchestrator) {
    this.secretaryOrchestrator = orchestrator;
  }

  public updateConfig(newConfig: ClinicConfig) {
    this.config = newConfig;
  }

  public subscribe(listener: AutomationEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getEventHistory(): AutomationEvent[] {
    return [...this.eventHistory];
  }

  public getExecutionHistory(): AutomationExecutionLog[] {
    return [...this.executionHistory];
  }

  /**
   * Main entry point to emit and process events through the engine.
   */
  async emit(event: AutomationEvent): Promise<AutomationExecutionLog[]> {
    this.eventHistory.unshift(event);
    if (this.eventHistory.length > 100) this.eventHistory.pop();

    const rules = await this.ruleRepo.getRules();
    const matchingRules = rules
      .filter((r) => r.enabled && r.eventType === event.type)
      .sort((a, b) => b.priority - a.priority);

    const logs: AutomationExecutionLog[] = [];

    // If no explicit rule matches, create a default baseline pass-through log
    if (matchingRules.length === 0) {
      const defaultLog: AutomationExecutionLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        eventId: event.id,
        eventType: event.type,
        ruleId: 'none',
        ruleName: 'Sin regla disparada',
        level: 'AUTO',
        status: 'SKIPPED',
        actionTaken: 'NO_MATCHING_RULE',
        timestamp: new Date().toISOString(),
        details: `Evento ${event.type} recibido sin reglas activas asociadas.`,
        payload: event.payload,
      };
      this.executionHistory.unshift(defaultLog);
      logs.push(defaultLog);
      this.notifyListeners(event, defaultLog);
      return logs;
    }

    for (const rule of matchingRules) {
      try {
        // Evaluate conditions
        let applies = true;
        if (typeof rule.conditions === 'function') {
          applies = await rule.conditions(event, this);
        }

        if (!applies) {
          const skipLog: AutomationExecutionLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            eventId: event.id,
            eventType: event.type,
            ruleId: rule.id,
            ruleName: rule.name,
            level: rule.level,
            status: 'SKIPPED',
            actionTaken: 'CONDITIONS_NOT_MET',
            timestamp: new Date().toISOString(),
            details: `Las condiciones de la regla ${rule.name} no se cumplieron.`,
          };
          this.executionHistory.unshift(skipLog);
          logs.push(skipLog);
          continue;
        }

        // Check autonomy level: MANUAL_ONLY
        if (rule.level === 'MANUAL_ONLY') {
          const manualLog: AutomationExecutionLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            eventId: event.id,
            eventType: event.type,
            ruleId: rule.id,
            ruleName: rule.name,
            level: rule.level,
            status: 'SKIPPED',
            actionTaken: 'BLOCKED_MANUAL_ONLY',
            timestamp: new Date().toISOString(),
            details: `La regla "${rule.name}" está restringida a ejecución exclusivamente manual.`,
          };
          this.executionHistory.unshift(manualLog);
          logs.push(manualLog);
          this.notifyListeners(event, manualLog);
          continue;
        }

        // Check autonomy level: ASK_PROFESSIONAL
        if (rule.level === 'ASK_PROFESSIONAL') {
          const decision = await this.routeToDecisionCenter(event, rule);
          const decisionLog: AutomationExecutionLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            eventId: event.id,
            eventType: event.type,
            ruleId: rule.id,
            ruleName: rule.name,
            level: rule.level,
            status: 'QUEUED_FOR_DECISION',
            actionTaken: 'QUEUED_FOR_DECISION',
            timestamp: new Date().toISOString(),
            details: `Derivado al Centro de Decisiones (#${decision.id}).`,
            payload: { decisionId: decision.id },
          };
          this.executionHistory.unshift(decisionLog);
          logs.push(decisionLog);
          this.notifyListeners(event, decisionLog);
          continue;
        }

        // AutomationLevel.AUTO: Execute immediately
        let actionResult: AutomationActionResult;
        if (typeof rule.execute === 'function') {
          actionResult = await rule.execute(event, this);
        } else {
          actionResult = await this.executeDefaultRuleAction(event, rule);
        }

        const execLog: AutomationExecutionLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          eventId: event.id,
          eventType: event.type,
          ruleId: rule.id,
          ruleName: rule.name,
          level: rule.level,
          status: actionResult.success ? 'EXECUTED' : 'FAILED',
          actionTaken: actionResult.actionTaken,
          timestamp: new Date().toISOString(),
          details: actionResult.message || `Acción ${actionResult.actionTaken} ejecutada.`,
          payload: actionResult.data,
        };

        this.executionHistory.unshift(execLog);
        logs.push(execLog);
        this.notifyListeners(event, execLog);

        const anyPayload = (event.payload || {}) as any;
        await this.auditRepo.recordEvent({
          actorType: 'SYSTEM_RULE',
          action: 'AUTOMATION_RULE_EXECUTED',
          entityType: 'APPOINTMENT',
          entityId: anyPayload.appointmentId || event.id,
          description: `Regla autónoma ejecutada: "${rule.name}" (${actionResult.actionTaken}).`,
        });
      } catch (err: any) {
        console.error(`Error executing rule ${rule.name}:`, err);
        const errLog: AutomationExecutionLog = {
          id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          eventId: event.id,
          eventType: event.type,
          ruleId: rule.id,
          ruleName: rule.name,
          level: rule.level,
          status: 'FAILED',
          actionTaken: 'EXECUTION_ERROR',
          timestamp: new Date().toISOString(),
          details: err.message,
        };
        this.executionHistory.unshift(errLog);
        logs.push(errLog);
        this.notifyListeners(event, errLog);
      }
    }

    if (this.executionHistory.length > 200) {
      this.executionHistory = this.executionHistory.slice(0, 200);
    }

    return logs;
  }

  private notifyListeners(event: AutomationEvent, log: AutomationExecutionLog) {
    this.listeners.forEach((listener) => {
      try {
        listener(event, log);
      } catch (err) {
        console.error('Error in automation listener:', err);
      }
    });
  }

  /**
   * Routes an item to the Decision Center.
   */
  private async routeToDecisionCenter(
    event: AutomationEvent,
    rule: AutomationRule
  ): Promise<DecisionItem> {
    const payload = (event.payload || {}) as any;
    return this.decisionRepo.createDecision({
      type: 'EXCEPTION_REQUEST',
      priority: 'HIGH',
      status: 'PENDING',
      title: `Decisión requerida: ${rule.name}`,
      whatHappened: `Se disparó el evento ${event.type}. ${payload.reason || 'Requiere validación profesional manual según política de autonomía.'}`,
      systemProposal: `El sistema propone ejecutar ${rule.name} para ${payload.patientName || 'el paciente'}.`,
      recommendedActions: [
        {
          id: `act_${Date.now()}_approve`,
          type: 'APPROVE_AUTOMATION',
          title: 'Aprobar propuesta',
          description: 'Aplica la acción calculada automáticamente.',
          isPrimary: true,
          payload,
        },
        {
          id: `act_${Date.now()}_dismiss`,
          type: 'DISMISS',
          title: 'Descartar acción',
          description: 'No ejecutar cambios.',
        },
      ],
      patientId: payload.patientId,
      patientName: payload.patientName,
      patientPhone: payload.patientPhone,
      appointmentId: payload.appointmentId,
      metadata: { eventId: event.id, ruleId: rule.id },
    });
  }

  /**
   * Default implementations for core rules.
   */
  private async executeDefaultRuleAction(
    event: AutomationEvent,
    rule: AutomationRule
  ): Promise<AutomationActionResult> {
    // 1. SLOT_RELEASED -> Autonomous Waitlist Offer
    if (event.type === AutomationEventType.SLOT_RELEASED) {
      const slot = (event.payload || {}) as any;
      const entries = await this.waitlistRepo.getWaitlistEntries('ACTIVE');
      if (entries.length === 0) {
        return { success: true, actionTaken: 'NO_WAITLIST_CANDIDATES' };
      }

      const candidate = entries[0];
      const patient = await this.patientRepo.getPatientById(candidate.patientId);
      if (!patient) return { success: false, actionTaken: 'PATIENT_NOT_FOUND' };

      const dateHuman = formatHumanDate(parseDateFromIso(slot.startIso));
      const timeHuman = formatTimeHs(parseTimeFromIso(slot.startIso));
      const timeoutMins = this.config.sequentialWaitlistOfferTimeoutMinutes || 15;
      const expiresAt = new Date(Date.now() + timeoutMins * 60 * 1000).toISOString();

      const offer = await this.waitlistRepo.createSlotOffer({
        waitlistEntryId: candidate.id,
        patientId: patient.id,
        professionalId: slot.professionalId || 'prof_demo_1',
        slotStartAt: slot.startIso,
        slotEndAt: slot.endIso,
        durationMinutes: 45,
        expiresAt,
        status: 'PENDING',
      });

      await this.waitlistRepo.updateWaitlistEntry(candidate.id, { status: 'OFFERED' });

      // Save in conversation session
      const session = await this.sessionRepo.getSessionByPhone(patient.whatsappPhone || patient.phone);
      if (session) {
        session.step = 'WAITLIST_OFFER_PENDING';
        session.pendingOfferId = offer.id;
        session.expiresAt = expiresAt;
        await this.sessionRepo.saveSession(session);
      }

      const offerMsg = `¡Hola ${patient.firstName}! Se liberó un turno en ${this.config.clinicName} para el ${dateHuman} a las ${timeHuman} hs. Al estar en nuestra lista de espera prioritaria, te lo ofrecemos en primer lugar. ¿Te gustaría reservarlo? Por favor respondé SÍ o NO dentro de los próximos ${timeoutMins} minutos.`;

      if (patient.whatsappPhone) {
        await this.whatsappProvider.sendMessage(patient.whatsappPhone, offerMsg);
      }

      return {
        success: true,
        actionTaken: 'WAITLIST_OFFER_DISPATCHED',
        message: `Oferta enviada a ${patient.firstName} ${patient.lastName} (expira en ${timeoutMins} min).`,
        data: { offerId: offer.id },
      };
    }

    // 2. SLOT_OFFER_EXPIRED -> Next candidate in Waitlist
    if (event.type === AutomationEventType.SLOT_OFFER_EXPIRED) {
      const payload = (event.payload || {}) as any;
      return this.emit({
        id: `evt_reoffer_${Date.now()}`,
        type: AutomationEventType.SLOT_RELEASED,
        timestamp: new Date().toISOString(),
        source: 'SYSTEM',
        payload: {
          date: parseDateFromIso(payload.slotStartIso || new Date().toISOString()),
          time: parseTimeFromIso(payload.slotStartIso || new Date().toISOString()),
          startIso: payload.slotStartIso,
          endIso: payload.slotEndIso,
          professionalId: payload.professionalId,
        },
      }).then((r) => ({
        success: true,
        actionTaken: 'REOFFER_TRIGGERED',
        data: r,
      }));
    }

    // Default generic success
    return {
      success: true,
      actionTaken: 'DEFAULT_ACTION_SUCCESS',
      message: `Acción para regla ${rule.name} procesada.`,
    };
  }
}
