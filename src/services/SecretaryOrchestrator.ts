import { IPatientRepository } from '../repositories/IPatientRepository.ts';
import { IAppointmentRepository } from '../repositories/IAppointmentRepository.ts';
import { IConversationRepository } from '../repositories/IConversationRepository.ts';
import { IConversationSessionRepository } from '../repositories/IConversationSessionRepository.ts';
import { IWaitlistRepository } from '../repositories/IWaitlistRepository.ts';
import { IDecisionRepository } from '../repositories/IDecisionRepository.ts';
import { IRequestRepository } from '../repositories/IRequestRepository.ts';
import { IWeeklyScheduleRepository } from '../repositories/IWeeklyScheduleRepository.ts';
import { IWhatsAppProvider } from '../integrations/whatsapp/IWhatsAppProvider.ts';
import { AppointmentService } from './AppointmentService.ts';
import {
  Patient,
  Appointment,
  AppointmentStatus,
  ClinicConfig,
  ConversationSession,
  CandidateSlot,
  AutomationEventType,
  RequestType,
  RequestStatus,
} from '../types/index.ts';
import { PatientIntent, StructuredAiExtraction } from '../integrations/ai/PatientIntent.ts';
import { normalizeArgentinePhoneNumber } from '../utils/phoneUtils.ts';
import {
  getTodayDateString,
  addDays,
  formatHumanDate,
  formatTimeHs,
  parseTimeFromIso,
  parseDateFromIso,
  buildIsoDateTime,
} from '../utils/dateUtils.ts';
import type { AutomationEngine } from './AutomationEngine.ts';

export interface ProcessMessageInput {
  phoneNumber: string;
  messageText: string;
  isAudio?: boolean;
  transcription?: string;
  externalMessageId?: string;
}

export interface SecretaryProcessResult {
  replyText: string;
  intent: PatientIntent;
  patient?: Patient;
  isNewPatientCreated?: boolean;
  requiresHumanReview: boolean;
  decisionId?: string;
  session: ConversationSession;
  executedActions: string[];
}

export class SecretaryOrchestrator {
  private automationEngine?: AutomationEngine;

  constructor(
    private patientRepo: IPatientRepository,
    private appointmentRepo: IAppointmentRepository,
    private conversationRepo: IConversationRepository,
    private sessionRepo: IConversationSessionRepository,
    private waitlistRepo: IWaitlistRepository,
    private decisionRepo: IDecisionRepository,
    private appointmentService: AppointmentService,
    private whatsappProvider: IWhatsAppProvider,
    private config: ClinicConfig,
    private requestRepo?: IRequestRepository,
    private weeklyScheduleRepo?: IWeeklyScheduleRepository
  ) {}

  public setAutomationEngine(engine: AutomationEngine) {
    this.automationEngine = engine;
  }

  public updateConfig(config: ClinicConfig) {
    this.config = config;
  }

  /**
   * Main entry point when a WhatsApp message is received.
   */
  async processInboundMessage(input: ProcessMessageInput): Promise<SecretaryProcessResult> {
    const rawText = (input.isAudio && input.transcription ? input.transcription : input.messageText).trim();
    const cleanPhone = normalizeArgentinePhoneNumber(input.phoneNumber);
    const executedActions: string[] = [];

    // 1. Identification: Lookup existing patient by phone
    const patientFound = (await this.patientRepo.getPatientByPhone(cleanPhone)) || (await this.patientRepo.getPatientByPhone(input.phoneNumber));
    let patient: Patient | undefined = patientFound || undefined;

    // Record incoming message in conversation history if patient exists or once created
    if (patient) {
      await this.conversationRepo.recordMessage({
        patientId: patient.id,
        direction: 'INBOUND',
        messageType: input.isAudio ? 'AUDIO' : 'TEXT',
        content: rawText,
        transcription: input.transcription,
        externalMessageId: input.externalMessageId,
        status: 'DELIVERED',
      });
    }

    // 2. Load or create ConversationSession
    let session = await this.sessionRepo.getSessionByPhone(cleanPhone);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // 30 min expiration

    if (!session) {
      session = {
        sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        phoneNumber: cleanPhone,
        patientId: patient ? patient.id : undefined,
        contactName: patient ? `${patient.firstName} ${patient.lastName}` : undefined,
        isUnknownContact: !patient,
        step: !patient ? 'AWAITING_PATIENT_NAME' : 'IDLE',
        candidateSlots: [],
        expiresAt,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
    } else {
      session.expiresAt = expiresAt;
      if (patient && !session.patientId) {
        session.patientId = patient.id;
        session.contactName = `${patient.firstName} ${patient.lastName}`;
        session.isUnknownContact = false;
      }
    }

    // 3. Handle Unknown Contact Identification Flow
    let isNewPatientCreated = false;
    if (!patient) {
      const isAwaitingName = session.step === 'AWAITING_PATIENT_NAME' || session.step === 'AWAITING_NAME';
      const detectedName = this.extractNameFromMessage(rawText, isAwaitingName);
      if (detectedName) {
        // Create minimum viable patient profile
        const parts = detectedName.split(' ');
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ') || 'Paciente';

        const created = await this.patientRepo.createPatient({
          firstName,
          lastName,
          phone: cleanPhone,
          whatsappPhone: cleanPhone,
          active: true,
          insurance: 'Particular',
        });

        patient = created;
        isNewPatientCreated = true;
        session.patientId = patient.id;
        session.contactName = `${patient.firstName} ${patient.lastName}`;
        session.isUnknownContact = false;
        session.step = 'IDLE';
        executedActions.push(`Paciente creado: ${patient.firstName} ${patient.lastName}`);

        // Record the inbound message now that patient is created
        await this.conversationRepo.recordMessage({
          patientId: patient.id,
          direction: 'INBOUND',
          messageType: input.isAudio ? 'AUDIO' : 'TEXT',
          content: rawText,
          transcription: input.transcription,
          externalMessageId: input.externalMessageId,
          status: 'DELIVERED',
        });

        const replyText = `¡Hola ${patient.firstName}! Ya registré tu contacto en ${this.config.clinicName}. ¿En qué horario o día te gustaría reservar tu sesión de kinesiología?`;
        await this.saveSessionAndReply(session, replyText, cleanPhone, patient.id);
        return {
          replyText,
          intent: PatientIntent.PROVIDE_NAME,
          patient,
          isNewPatientCreated: true,
          requiresHumanReview: false,
          session,
          executedActions,
        };
      } else {
        // Unknown contact without name -> Prompt for identification
        session.step = 'AWAITING_PATIENT_NAME';
        const replyText = `¡Hola! Te comunicás con la secretaría digital de ${this.config.clinicName}. Para poder coordinar tu turno, ¿me dirías tu Nombre y Apellido por favor?`;
        await this.saveSessionAndReply(session, replyText, cleanPhone, undefined);
        return {
          replyText,
          intent: PatientIntent.PROVIDE_NAME,
          requiresHumanReview: false,
          session,
          executedActions: ['Solicitud de nombre a contacto no identificado'],
        };
      }
    }

    const patientName = patient ? patient.firstName : 'Paciente';

    // 4. Memory check: Is patient responding to a Waitlist SlotOffer?
    if (session.step === 'WAITLIST_OFFER_PENDING' && session.pendingOfferId) {
      const isAffirmative = this.isAffirmativeResponse(rawText);
      const isNegative = this.isNegativeResponse(rawText);

      if (isAffirmative) {
        // ACCEPT_OFFER: Revalidate and book!
        const offer = await this.waitlistRepo.getOfferById(session.pendingOfferId);
        if (offer && offer.status === 'PENDING') {
          // Re-validate that slot is still free
          const slotDate = parseDateFromIso(offer.slotStartAt);
          const slotTime = parseTimeFromIso(offer.slotStartAt);
          const isAvailable = await this.appointmentService.isSlotAvailable(
            slotDate,
            slotTime,
            offer.durationMinutes,
            offer.professionalId
          );

          if (isAvailable && patient) {
            // Confirm and book!
            const newApp = await this.appointmentRepo.createAppointment({
              patientId: patient.id,
              professionalId: offer.professionalId,
              startAt: offer.slotStartAt,
              endAt: offer.slotEndAt,
              durationMinutes: offer.durationMinutes,
              status: AppointmentStatus.CONFIRMED,
              source: 'WAITLIST',
              appointmentTypeId: 'apt_type_standard',
              administrativeNotes: 'Asignado automáticamente por Lista de Espera',
            });

            await this.waitlistRepo.updateOfferStatus(offer.id, 'ACCEPTED');
            await this.waitlistRepo.updateEntryStatus(offer.waitlistEntryId, 'BOOKED');

            session.step = 'IDLE';
            session.pendingOfferId = undefined;

            const dateHuman = formatHumanDate(slotDate);
            const timeHuman = formatTimeHs(slotTime);
            const replyText = `¡Excelente ${patientName}! Tu turno de lista de espera para el ${dateHuman} a las ${timeHuman} ha quedado reservado y confirmado. ¡Te esperamos!`;

            await this.saveSessionAndReply(session, replyText, cleanPhone, patient.id);
            executedActions.push(`Turno confirmado de Waitlist: ${slotDate} ${slotTime}`);

            if (this.automationEngine) {
              await this.automationEngine.emit({
                id: `evt_${Date.now()}`,
                type: AutomationEventType.APPOINTMENT_CONFIRMED,
                timestamp: new Date().toISOString(),
                source: 'WHATSAPP',
                payload: {
                  appointmentId: newApp.id,
                  patientId: patient.id,
                  patientName: `${patient.firstName} ${patient.lastName}`,
                  professionalId: newApp.professionalId,
                  startIso: newApp.startAt,
                  endIso: newApp.endAt,
                },
              });
            }

            return {
              replyText,
              intent: PatientIntent.ACCEPT_OFFER,
              patient,
              requiresHumanReview: false,
              session,
              executedActions,
            };
          }
        }
      } else if (isNegative) {
        // DECLINE_OFFER: Reject and offer to next candidate immediately!
        const offerId = session.pendingOfferId;
        const offer = await this.waitlistRepo.getOfferById(offerId);
        if (offer) {
          await this.waitlistRepo.updateOfferStatus(offerId, 'DECLINED');
          if (this.automationEngine) {
            await this.automationEngine.emit({
              id: `evt_rej_${Date.now()}`,
              type: AutomationEventType.SLOT_OFFER_EXPIRED,
              timestamp: new Date().toISOString(),
              source: 'WHATSAPP',
              payload: {
                offerId: offer.id,
                waitlistEntryId: offer.waitlistEntryId,
                patientId: offer.patientId,
                slotStartIso: offer.slotStartAt,
                slotEndIso: offer.slotEndAt,
                professionalId: offer.professionalId,
              },
            });
          }
        }

        session.step = 'IDLE';
        session.pendingOfferId = undefined;

        const replyText = `Entendido, ${patientName}. Dejamos el turno disponible para otro paciente y te mantendremos en la lista para futuras oportunidades. ¡Gracias por responder!`;
        await this.saveSessionAndReply(session, replyText, cleanPhone, patient ? patient.id : undefined);
        executedActions.push('Oferta rechazada y re-ofertada al siguiente candidato');

        return {
          replyText,
          intent: PatientIntent.DECLINE_OFFER,
          patient,
          requiresHumanReview: false,
          session,
          executedActions,
        };
      }
    }

    // 5. Memory check: Is patient choosing one of the offered candidate slots?
    const currentCandidateSlots = session.candidateSlots || [];
    if (session.step === 'SLOTS_OFFERED' && currentCandidateSlots.length > 0) {
      const selectedSlot = this.matchCandidateSlot(rawText, currentCandidateSlots);
      if (selectedSlot && patient) {
        // Valid slot selected from memory!
        const isFree = await this.appointmentService.isSlotAvailable(
          selectedSlot.date,
          selectedSlot.time,
          45,
          selectedSlot.professionalId
        );

        if (isFree) {
          const needsApproval = this.config.requiresApprovalForNewAppointment || (Boolean(this.config.approvalRules?.requireApprovalForNewAppointment) && Boolean(this.requestRepo));

          if (needsApproval) {
            // Create pending request for professional review
            if (this.requestRepo) {
              await this.requestRepo.createRequest({
                patientId: patient.id,
                patientName: `${patient.firstName} ${patient.lastName}`,
                patientPhone: cleanPhone,
                patientMessage: rawText,
                type: RequestType.NEW,
                preferredDate: selectedSlot.date,
                preferredTime: selectedSlot.time,
                suggestedStartIso: selectedSlot.startIso,
                suggestedEndIso: selectedSlot.endIso,
                professionalId: selectedSlot.professionalId,
                source: 'WHATSAPP_TWILIO',
                administrativeNotes: `Solicitado por WhatsApp. Arancel: $${(this.config.consultationFee || 15000).toLocaleString('es-AR')}`,
                originalMessage: rawText,
              });
            }

            const slotLabel = selectedSlot.humanLabel || selectedSlot.human || `${selectedSlot.date} ${selectedSlot.time}`;
            const decision = await this.decisionRepo.createDecision({
              title: `Solicitud de turno: ${patient.firstName} ${patient.lastName}`,
              description: `El paciente seleccionó el horario ${slotLabel} por WhatsApp.`,
              source: 'SECRETARY_AI',
              severity: 'warning',
              priority: 'HIGH',
              patientId: patient.id,
              patientName: `${patient.firstName} ${patient.lastName}`,
              patientPhone: cleanPhone,
              proposedAction: {
                type: 'APPROVE_REQUEST',
                label: `Confirmar turno (${slotLabel})`,
                details: `Arancel: $${(this.config.consultationFee || 15000).toLocaleString('es-AR')}`,
              },
            });

            session.step = 'AWAITING_PROFESSIONAL';
            session.candidateSlots = [];

            // Mensaje profesional argentino:
            // "Perfecto. Ya le avisé al profesional. Apenas confirme el horario te aviso por acá."
            const replyText = `Perfecto, ${patientName}. Ya le avisé al profesional. Apenas confirme el horario te aviso por acá.`;
            await this.saveSessionAndReply(session, replyText, cleanPhone, patient.id);
            executedActions.push(`Solicitud PENDIENTE DE PROFESIONAL creada para ${slotLabel}`);

            return {
              replyText,
              intent: PatientIntent.REQUEST_APPOINTMENT,
              patient,
              requiresHumanReview: true,
              decisionId: decision.id,
              session,
              executedActions,
            };
          }

          // Modo autónomo (ej: tests automatizados con requiresApproval=false)
          const startIso = selectedSlot.startIso;
          const endIso = selectedSlot.endIso;

          const createdApp = await this.appointmentRepo.createAppointment({
            patientId: patient.id,
            professionalId: selectedSlot.professionalId,
            startAt: startIso,
            endAt: endIso,
            durationMinutes: 45,
            status: AppointmentStatus.CONFIRMED,
            source: 'WHATSAPP_AI',
            appointmentTypeId: 'apt_type_standard',
            administrativeNotes: 'Agendado conversacionalmente por Secretaria Digital',
          });

          session.step = 'IDLE';
          session.candidateSlots = [];
          const slotLabel = selectedSlot.humanLabel || selectedSlot.human || `${selectedSlot.date} ${selectedSlot.time}`;
          executedActions.push(`Turno agendado autónomamente: ${slotLabel}`);

          const replyText = `¡Listo, ${patientName}! Tu turno quedó agendado y confirmado para el ${slotLabel}. Te esperamos en ${this.config.clinicName}.`;
          await this.saveSessionAndReply(session, replyText, cleanPhone, patient.id);

          if (this.automationEngine) {
            await this.automationEngine.emit({
              id: `evt_${Date.now()}`,
              type: AutomationEventType.APPOINTMENT_CONFIRMED,
              timestamp: new Date().toISOString(),
              source: 'WHATSAPP',
              payload: {
                appointmentId: createdApp.id,
                patientId: patient.id,
                patientName: `${patient.firstName} ${patient.lastName}`,
                professionalId: createdApp.professionalId,
                startIso: createdApp.startAt,
                endIso: createdApp.endAt,
              },
            });
          }

          return {
            replyText,
            intent: PatientIntent.REQUEST_APPOINTMENT,
            patient,
            requiresHumanReview: false,
            session,
            executedActions,
          };
        } else {
          // Slot was taken in the meantime! Offer alternatives immediately.
          session.candidateSlots = [];
        }
      }
    }

    // 6. Structured Intent Detection
    const extraction = this.detectStructuredIntent(rawText);
    session.activeIntent = extraction.intent;

    // 7. Route according to Intent
    switch (extraction.intent) {
      case PatientIntent.FAQ_INQUIRY: {
        const replyText = this.handleFaqInquiry(rawText, patientName);
        await this.saveSessionAndReply(session, replyText, cleanPhone, patient ? patient.id : undefined);
        executedActions.push('Respuesta automática de FAQ del consultorio');
        return {
          replyText,
          intent: PatientIntent.FAQ_INQUIRY,
          patient,
          requiresHumanReview: false,
          session,
          executedActions,
        };
      }

      case PatientIntent.CHECK_APPOINTMENT: {
        if (!patient) {
          const replyText = `Para consultar tu turno necesito registrar tu nombre. ¿Me decís tu Nombre y Apellido?`;
          await this.saveSessionAndReply(session, replyText, cleanPhone);
          return { replyText, intent: PatientIntent.CHECK_APPOINTMENT, requiresHumanReview: false, session, executedActions };
        }

        const upcoming = await this.appointmentRepo.getPatientActiveAppointments(patient.id);
        if (upcoming.length === 0) {
          const replyText = `Hola ${patientName}, no tenés ningún turno pendiente en este momento. ¿Te gustaría que te ofrezca horarios disponibles para agendar uno?`;
          await this.saveSessionAndReply(session, replyText, cleanPhone, patient.id);
          return { replyText, intent: PatientIntent.CHECK_APPOINTMENT, patient, requiresHumanReview: false, session, executedActions };
        }

        const nextApp = upcoming[0];
        const appDate = parseDateFromIso(nextApp.startAt);
        const appTime = parseTimeFromIso(nextApp.startAt);
        const dateHuman = formatHumanDate(appDate);
        const timeHuman = formatTimeHs(appTime);
        const replyText = `Hola ${patientName}, tenés un turno programado para el ${dateHuman} a las ${timeHuman} con ${this.config.professionalDisplayName}. ¡Te esperamos!`;
        await this.saveSessionAndReply(session, replyText, cleanPhone, patient.id);
        executedActions.push(`Consulta de turno: ${dateHuman} ${timeHuman}`);
        return { replyText, intent: PatientIntent.CHECK_APPOINTMENT, patient, requiresHumanReview: false, session, executedActions };
      }

      case PatientIntent.CONFIRM_APPOINTMENT: {
        if (patient) {
          const upcoming = await this.appointmentRepo.getPatientActiveAppointments(patient.id);
          if (upcoming.length > 0) {
            const app = upcoming[0];
            await this.appointmentRepo.updateAppointmentStatus(app.id, AppointmentStatus.CONFIRMED);
            const appDate = parseDateFromIso(app.startAt);
            const appTime = parseTimeFromIso(app.startAt);
            const dateHuman = formatHumanDate(appDate);
            const timeHuman = formatTimeHs(appTime);
            const replyText = `¡Perfecto ${patientName}! Tu turno del ${dateHuman} a las ${timeHuman} ha quedado confirmado. ¡Muchas gracias!`;
            await this.saveSessionAndReply(session, replyText, cleanPhone, patient.id);
            executedActions.push(`Turno confirmado por WhatsApp: ${app.id}`);
            return { replyText, intent: PatientIntent.CONFIRM_APPOINTMENT, patient, requiresHumanReview: false, session, executedActions };
          }
        }
        const replyText = `¡Gracias por tu mensaje ${patientName}! Ya dejamos registrada la confirmación.`;
        await this.saveSessionAndReply(session, replyText, cleanPhone, patient ? patient.id : undefined);
        return { replyText, intent: PatientIntent.CONFIRM_APPOINTMENT, patient, requiresHumanReview: false, session, executedActions };
      }

      case PatientIntent.CANCEL_APPOINTMENT: {
        if (!patient) {
          const replyText = `Para cancelar un turno necesitamos identificar tus datos. ¿Podrías indicarnos tu Nombre y Apellido?`;
          await this.saveSessionAndReply(session, replyText, cleanPhone);
          return { replyText, intent: PatientIntent.CANCEL_APPOINTMENT, requiresHumanReview: false, session, executedActions };
        }

        const upcoming = await this.appointmentRepo.getPatientActiveAppointments(patient.id);
        if (upcoming.length === 0) {
          const replyText = `Hola ${patientName}, no tenés turnos activos para cancelar en el sistema. Si necesitás agendar uno nuevo, avísame.`;
          await this.saveSessionAndReply(session, replyText, cleanPhone, patient.id);
          return { replyText, intent: PatientIntent.CANCEL_APPOINTMENT, patient, requiresHumanReview: false, session, executedActions };
        }

        const targetApp = upcoming[0];
        await this.appointmentRepo.updateAppointmentStatus(targetApp.id, AppointmentStatus.CANCELLED);

        const appDate = parseDateFromIso(targetApp.startAt);
        const appTime = parseTimeFromIso(targetApp.startAt);
        const dateHuman = formatHumanDate(appDate);
        const timeHuman = formatTimeHs(appTime);
        const replyText = `Lamentamos que no puedas venir, ${patientName}. Tu turno del ${dateHuman} a las ${timeHuman} ha sido cancelado con éxito. Cuando desees volver a coordinar, escribinos por acá.`;

        await this.saveSessionAndReply(session, replyText, cleanPhone, patient.id);
        executedActions.push(`Turno cancelado: ${targetApp.id} (${dateHuman} ${timeHuman})`);

        // Emit APPOINTMENT_CANCELLED and SLOT_RELEASED to trigger Waitlist Auto-heal!
        if (this.automationEngine) {
          await this.automationEngine.emit({
            id: `evt_canc_${Date.now()}`,
            type: AutomationEventType.APPOINTMENT_CANCELLED,
            timestamp: new Date().toISOString(),
            source: 'WHATSAPP',
            payload: {
              appointmentId: targetApp.id,
              patientId: patient.id,
              patientName: `${patient.firstName} ${patient.lastName}`,
              professionalId: targetApp.professionalId,
              startIso: targetApp.startAt,
              endIso: targetApp.endAt,
              reason: 'Cancelado por el paciente por WhatsApp',
            },
          });

          await this.automationEngine.emit({
            id: `evt_slot_${Date.now()}`,
            type: AutomationEventType.SLOT_RELEASED,
            timestamp: new Date().toISOString(),
            source: 'SYSTEM',
            payload: {
              date: appDate,
              time: appTime,
              startIso: targetApp.startAt,
              endIso: targetApp.endAt,
              professionalId: targetApp.professionalId,
              releasedByAppointmentId: targetApp.id,
              reason: 'Cancelación de turno',
            },
          });
        }

        return {
          replyText,
          intent: PatientIntent.CANCEL_APPOINTMENT,
          patient,
          requiresHumanReview: false,
          session,
          executedActions,
        };
      }

      case PatientIntent.REPORT_DELAY: {
        const replyText = `Muchas gracias por avisarnos ${patientName}. Ya le dejamos una nota al kinesiólogo avisando de tu demora para esperarte en el consultorio.`;
        await this.saveSessionAndReply(session, replyText, cleanPhone, patient ? patient.id : undefined);
        executedActions.push('Demora de paciente registrada y notificada');
        return { replyText, intent: PatientIntent.REPORT_DELAY, patient, requiresHumanReview: false, session, executedActions };
      }

      case PatientIntent.ASK_PRICE: {
        const fee = this.config.consultationFee || 15000;
        const replyText = `Hola ${patientName}. La sesión particular de kinesiología tiene un valor de $${fee.toLocaleString('es-AR')}. ¿Te gustaría que te ofrezca horarios disponibles para coordinar un turno?`;
        await this.saveSessionAndReply(session, replyText, cleanPhone, patient ? patient.id : undefined);
        executedActions.push(`Informado arancel: $${fee}`);
        return { replyText, intent: PatientIntent.ASK_PRICE, patient, requiresHumanReview: false, session, executedActions };
      }

      case PatientIntent.ASK_DELAY: {
        const delay = this.config.currentDelayMinutes || 0;
        const replyText = delay > 0
          ? `Hola ${patientName}. En este momento estamos con aproximadamente ${delay} minutos de demora en el consultorio. Te avisamos para que puedas organizarte con tranquilidad.`
          : `Hola ${patientName}. En este momento el consultorio está atendiendo con puntualidad y sin demoras.`;
        await this.saveSessionAndReply(session, replyText, cleanPhone, patient ? patient.id : undefined);
        executedActions.push(`Informada demora actual: ${delay} min`);
        return { replyText, intent: PatientIntent.ASK_DELAY, patient, requiresHumanReview: false, session, executedActions };
      }

      case PatientIntent.REQUEST_APPOINTMENT:
      case PatientIntent.CHANGE_APPOINTMENT:
      case PatientIntent.CHECK_AVAILABILITY: {
        // Find 2-3 real available slots in agenda (only from PUBLISHED weeks!)
        const candidateSlots = await this.findAvailableSlotsForPatient(3);

        if (candidateSlots.length === 0) {
          // No slots available! Ask if patient wants waitlist or create Decision Center item
          const replyText = `Hola ${patientName}, en este momento la agenda está completa para los próximos días. ¿Te gustaría que te agregue a nuestra Lista de Espera prioritaria por si se libera un hueco?`;
          await this.saveSessionAndReply(session, replyText, cleanPhone, patient ? patient.id : undefined);
          return { replyText, intent: extraction.intent, patient, requiresHumanReview: false, session, executedActions };
        }

        // Store candidate slots in ConversationSession memory!
        session.candidateSlots = candidateSlots;
        session.step = 'SLOTS_OFFERED';
        executedActions.push(`Horarios ofrecidos guardados en memoria (${candidateSlots.length} opciones)`);

        const slotOptionsText = candidateSlots
          .map((s, idx) => `${idx + 1}️⃣ ${s.humanLabel || s.human || `${s.date} ${s.time}`}`)
          .join('\n');

        const fee = this.config.consultationFee || 15000;
        const feeText = `La sesión tiene un valor de $${fee.toLocaleString('es-AR')}.`;
        const replyText = `Hola ${patientName}. Sí, puedo ayudarte. Para kinesiología disponemos de los siguientes turnos libres:\n\n${slotOptionsText}\n\n${feeText} ¿Cuál te queda mejor? (Podés responder con el número o el día/hora).`;

        await this.saveSessionAndReply(session, replyText, cleanPhone, patient ? patient.id : undefined);

        return {
          replyText,
          intent: extraction.intent,
          patient,
          requiresHumanReview: false,
          session,
          executedActions,
        };
      }

      case PatientIntent.GREETING: {
        const replyText = `¡Hola ${patientName}! ¿Cómo estás? Soy la asistente digital de ${this.config.clinicName}. ¿En qué te puedo ayudar hoy?`;
        await this.saveSessionAndReply(session, replyText, cleanPhone, patient ? patient.id : undefined);
        return { replyText, intent: PatientIntent.GREETING, patient, requiresHumanReview: false, session, executedActions };
      }

      case PatientIntent.AMBIGUOUS:
      default: {
        // Ambiguous or exceptional request: Queue to Decision Center!
        const decision = await this.decisionRepo.createDecision({
          title: `Mensaje de ${patientName} requiere atención`,
          description: `El paciente escribió: "${rawText}". La secretaria no pudo clasificar una intención determinística unívoca.`,
          source: 'SECRETARY_AI',
          severity: 'warning',
          patientId: patient?.id,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : cleanPhone,
          patientPhone: cleanPhone,
          proposedAction: {
            type: 'SEND_WHATSAPP',
            label: 'Responder manualmente por WhatsApp',
            details: 'Abrir el chat del paciente para responder a su consulta puntual.',
          },
        });

        const replyText = `Hola ${patientName}, recibí tu consulta: "${rawText}". Ya se la transmití al profesional para responderte de forma personalizada a la brevedad.`;
        await this.saveSessionAndReply(session, replyText, cleanPhone, patient ? patient.id : undefined);
        executedActions.push(`Enviado al Decision Center (#${decision.id})`);

        return {
          replyText,
          intent: PatientIntent.AMBIGUOUS,
          patient,
          requiresHumanReview: true,
          decisionId: decision.id,
          session,
          executedActions,
        };
      }
    }
  }

  /**
   * Saves updated session state and dispatches outbound WhatsApp message.
   */
  private async saveSessionAndReply(
    session: ConversationSession,
    replyText: string,
    phoneNumber: string,
    patientId?: string
  ): Promise<void> {
    await this.sessionRepo.saveSession(session);
    await this.whatsappProvider.sendMessage(phoneNumber, replyText);

    if (patientId) {
      await this.conversationRepo.recordMessage({
        patientId,
        direction: 'OUTBOUND',
        messageType: 'TEXT',
        content: replyText,
        status: 'SENT',
      });
    }
  }

  /**
   * Helper: Matches candidate slot from conversation memory based on natural user phrases.
   */
  private matchCandidateSlot(text: string, candidates: CandidateSlot[]): CandidateSlot | null {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 1. By index: "1", "el primero", "opcion 1", "primera"
    if (/\b(1|primero|primera|opcion 1|el 1)\b/.test(lower) && candidates[0]) return candidates[0];
    if (/\b(2|segundo|segunda|opcion 2|el 2)\b/.test(lower) && candidates[1]) return candidates[1];
    if (/\b(3|tercero|tercera|opcion 3|el 3)\b/.test(lower) && candidates[2]) return candidates[2];

    // 2. By hour: e.g. "a las 17", "17:00", "18", "16:30"
    for (const c of candidates) {
      const hourOnly = c.time.split(':')[0];
      if (lower.includes(c.time) || lower.includes(`${hourOnly} hs`) || lower.includes(`${hourOnly}hs`) || lower.includes(`a las ${hourOnly}`)) {
        return c;
      }
    }

    // 3. By day name: "miercoles", "jueves", "viernes", "manana"
    for (const c of candidates) {
      const label = c.humanLabel || c.human || '';
      const labelLower = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const dayWord = labelLower.split(' ')[0]; // e.g. "miercoles"
      if (dayWord && lower.includes(dayWord)) {
        return c;
      }
    }

    return null;
  }

  /**
   * Finds 2-3 real, conflict-free available slots in upcoming days.
   */
  private async findAvailableSlotsForPatient(limit = 3): Promise<CandidateSlot[]> {
    const today = getTodayDateString();
    const candidateSlots: CandidateSlot[] = [];

    // Scan the next 5 days
    for (let dayOffset = 0; dayOffset <= 5 && candidateSlots.length < limit; dayOffset++) {
      const dateStr = addDays(today, dayOffset);

      // Regla: La secretaria SOLAMENTE puede ofrecer turnos de semanas PUBLISHED!
      if (this.weeklyScheduleRepo) {
        const isPublished = await this.weeklyScheduleRepo.isDateInPublishedSchedule(dateStr);
        if (!isPublished) continue;
      }

      const schedule = await this.appointmentService.getDaySchedule(dateStr);

      const freeSlots = schedule.filter((s) => s.isAvailable && !s.isPast);
      for (const slot of freeSlots) {
        if (candidateSlots.length >= limit) break;
        const dateHuman = formatHumanDate(dateStr);
        const timeHuman = formatTimeHs(slot.time);

        candidateSlots.push({
          slotId: `slot_${dateStr}_${slot.time.replace(':', '')}`,
          date: dateStr,
          time: slot.time,
          startIso: slot.startIso,
          endIso: slot.endIso,
          professionalId: 'prof_demo_1',
          humanLabel: `${dateHuman} a las ${timeHuman}`,
          human: `${dateHuman} a las ${timeHuman}`,
        });
      }
    }

    return candidateSlots;
  }

  /**
   * Argentine/Latin heuristics for intent classification.
   */
  private detectStructuredIntent(text: string): StructuredAiExtraction {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Ask Price
    if (
      lower.includes('cuanto sale') ||
      lower.includes('cuanto cuesta') ||
      lower.includes('precio') ||
      lower.includes('arancel') ||
      lower.includes('costo de la sesion') ||
      lower.includes('honorarios') ||
      lower.includes('valor de la consulta') ||
      lower.includes('cuanto cobran')
    ) {
      return { intent: PatientIntent.ASK_PRICE, confidence: 0.95, requiresClarification: false };
    }

    // Ask Delay
    if (
      lower.includes('estan con demora') ||
      lower.includes('hay demora') ||
      lower.includes('tienen demora') ||
      lower.includes('vienen a horario') ||
      lower.includes('estan a horario') ||
      lower.includes('cuanto de demora') ||
      lower.includes('hay espera')
    ) {
      return { intent: PatientIntent.ASK_DELAY, confidence: 0.93, requiresClarification: false };
    }

    // FAQ Check
    if (
      lower.includes('donde') ||
      lower.includes('direccion') ||
      lower.includes('ubicacion') ||
      lower.includes('cuanto sale') ||
      lower.includes('precio') ||
      lower.includes('costo') ||
      lower.includes('honorario') ||
      lower.includes('obra social') ||
      lower.includes('obras sociales') ||
      lower.includes('osde') ||
      lower.includes('particular') ||
      lower.includes('que tengo que llevar') ||
      lower.includes('ropa')
    ) {
      return { intent: PatientIntent.FAQ_INQUIRY, confidence: 0.95, requiresClarification: false };
    }

    // Delay Report
    if (
      lower.includes('demorad') ||
      lower.includes('llego tarde') ||
      lower.includes('minutos tarde') ||
      lower.includes('con retraso') ||
      lower.includes('atrasado') ||
      lower.includes('demorado') ||
      lower.includes('demora')
    ) {
      return { intent: PatientIntent.REPORT_DELAY, confidence: 0.9, requiresClarification: false };
    }

    // Cancellation
    if (
      lower.includes('cancel') ||
      lower.includes('no voy a poder') ||
      lower.includes('no puedo ir') ||
      lower.includes('no llego') ||
      lower.includes('dar de baja') ||
      lower.includes('imposible asistir')
    ) {
      return { intent: PatientIntent.CANCEL_APPOINTMENT, confidence: 0.92, requiresClarification: false };
    }

    // Confirmation
    if (
      this.isAffirmativeResponse(text) &&
      (lower.includes('turno') || lower.includes('confirmo') || lower.length < 15)
    ) {
      return { intent: PatientIntent.CONFIRM_APPOINTMENT, confidence: 0.88, requiresClarification: false };
    }

    // Checking Appointment
    if (
      lower.includes('cuando tengo') ||
      lower.includes('a que hora') ||
      lower.includes('mi turno') ||
      lower.includes('consultar turno') ||
      lower.includes('recordar turno')
    ) {
      return { intent: PatientIntent.CHECK_APPOINTMENT, confidence: 0.9, requiresClarification: false };
    }

    // Requesting or Changing Appointment
    if (
      lower.includes('turno') ||
      lower.includes('sesion') ||
      lower.includes('cambiar') ||
      lower.includes('reprogramar') ||
      lower.includes('horario') ||
      lower.includes('hueco') ||
      lower.includes('lugar') ||
      lower.includes('disponibilidad') ||
      lower.includes('agendar')
    ) {
      if (lower.includes('cambiar') || lower.includes('reprogramar') || lower.includes('mover')) {
        return { intent: PatientIntent.CHANGE_APPOINTMENT, confidence: 0.9, requiresClarification: false };
      }
      return { intent: PatientIntent.REQUEST_APPOINTMENT, confidence: 0.9, requiresClarification: false };
    }

    // Greetings
    if (
      lower === 'hola' ||
      lower.startsWith('hola ') ||
      lower.startsWith('buenas') ||
      lower.startsWith('buen dia')
    ) {
      return { intent: PatientIntent.GREETING, confidence: 0.95, requiresClarification: false };
    }

    // Fallback: Ambiguous
    return {
      intent: PatientIntent.AMBIGUOUS,
      confidence: 0.4,
      requiresClarification: true,
      clarificationQuestion: '¿En qué te puedo ayudar con tu turno de kinesiología?',
    };
  }

  private handleFaqInquiry(text: string, patientName: string): string {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    if (lower.includes('donde') || lower.includes('direccion') || lower.includes('ubicacion')) {
      return `Hola ${patientName}, el consultorio se encuentra en Av. Colón 1234, Barrio Alberdi, Córdoba. Contamos con estacionamiento frente a la clínica y rampa de acceso.`;
    }

    if (lower.includes('precio') || lower.includes('costo') || lower.includes('cuanto') || lower.includes('honorario')) {
      return `Hola ${patientName}, la sesión particular de kinesiología y fisioterapia tiene un arancel de $14.000. También emitimos factura para reintegro de obras sociales y prepagas.`;
    }

    if (lower.includes('obra social') || lower.includes('obras sociales') || lower.includes('osde') || lower.includes('prepaga')) {
      return `Hola ${patientName}, trabajamos con pacientes particulares y emitimos factura oficial con código nomenclador kinesiológico para reintegro en prepagas y obras sociales.`;
    }

    return `Hola ${patientName}, atendemos de lunes a viernes de 08:00 a 19:00 hs. Para tu primera sesión recordá traer tu orden médica y asistir con ropa cómoda deportiva.`;
  }

  private extractNameFromMessage(text: string, isAwaitingName = false): string | null {
    const clean = text.trim();
    // 1. Explicit introduction phrases: "Hola soy Camila Morales", "Me llamo Martín Sosa", "Mi nombre es Juan Pérez"
    const match = clean.match(/(?:soy|me llamo|mi nombre es)\s+([A-Za-zÀ-ÿ]+(?:\s+[A-Za-zÀ-ÿ]+)?)/i);
    if (match && match[1]) {
      const candidate = match[1].trim();
      const forbidden = ['un', 'una', 'el', 'la', 'kinesiologo', 'paciente', 'nuevo', 'hola'];
      if (!forbidden.includes(candidate.toLowerCase())) {
        return candidate;
      }
    }

    // 2. If specifically awaiting name from the user, allow "Nombre Apellido"
    if (isAwaitingName) {
      const words = clean.split(/\s+/);
      const stopWords = ['hola', 'buenas', 'buen', 'dia', 'tarde', 'noche', 'quiero', 'turno', 'horario', 'saber', 'necesito', 'consulta', 'gracias', 'por', 'favor'];
      const hasStopWord = words.some((w) => stopWords.includes(w.toLowerCase()));
      if (!hasStopWord && words.length >= 2 && words.length <= 3 && words.every((w) => /^[A-Za-zÀ-ÿ]+$/.test(w))) {
        return words.join(' ');
      }
    }

    return null;
  }

  private isAffirmativeResponse(text: string): boolean {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return (
      lower === 'si' ||
      lower === 'sí' ||
      lower === 'dale' ||
      lower === 'me sirve' ||
      lower === 'confirmo' ||
      lower === 'lo tomo' ||
      lower === 'voy' ||
      lower === 'perfecto' ||
      lower.startsWith('si ') ||
      lower.startsWith('dale')
    );
  }

  private isNegativeResponse(text: string): boolean {
    const lower = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    return (
      lower === 'no' ||
      lower === 'paso' ||
      lower === 'no puedo' ||
      lower === 'ceder' ||
      lower === 'rechazo' ||
      lower.startsWith('no ') ||
      lower.startsWith('no puedo')
    );
  }
}
