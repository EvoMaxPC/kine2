import { IAppointmentRepository } from '../repositories/IAppointmentRepository.ts';
import { IPatientRepository } from '../repositories/IPatientRepository.ts';
import { IRequestRepository } from '../repositories/IRequestRepository.ts';
import { IAuditRepository } from '../repositories/IAuditRepository.ts';
import { IConversationRepository } from '../repositories/IConversationRepository.ts';
import { IWaitlistRepository } from '../repositories/IWaitlistRepository.ts';
import { IProfessionalRepository } from '../repositories/IProfessionalRepository.ts';
import { IWhatsAppProvider } from '../integrations/whatsapp/IWhatsAppProvider.ts';
import {
  Appointment,
  AppointmentStatus,
  AppointmentRequest,
  RequestStatus,
  RequestType,
  Patient,
  ScheduleBlock,
  ClinicConfig,
  DEFAULT_CLINIC_CONFIG,
  getClinicDailyStatus,
  ConfirmationStatus,
  WaitlistEntry,
  SlotOffer,
  SeriesFrequency,
  AppointmentSeries,
} from '../types/index.ts';
import {
  formatHumanDate,
  formatTimeHs,
  parseDateFromIso,
  parseTimeFromIso,
  getTodayDateString,
  addDays,
  buildIsoDateTime,
  computeEndIso,
  doIntervalsOverlap,
} from '../utils/dateUtils.ts';
import { ConversationPolicy } from '../integrations/ai/ConversationPolicy.ts';
import { detectPotentialDuplicatePatient, DuplicateCheckResult } from '../utils/patientUtils.ts';
import { normalizeArgentinePhoneNumber } from '../utils/phoneUtils.ts';

export interface DaySlotViewModel {
  time: string;
  startIso: string;
  endIso: string;
  isAvailable: boolean;
  isBlocked?: boolean;
  blockReason?: string;
  isPast?: boolean;
  isNow?: boolean;
  isNext?: boolean;
  appointment?: Appointment;
  patient?: Patient;
}

export interface WaitingRoomPatient {
  appointment: Appointment;
  patient: Patient;
  arrivedAt: string;
  waitingMinutes: number;
  isBeingAttended: boolean;
}

export interface TodayOverviewSummary {
  dateString: string;
  clinicStatus: { text: string; isOpen: boolean };
  totalAppointmentsCount: number;
  completedCount: number;
  remainingCount: number;
  freeSlotsCount: number;
  pendingRequestsCount: number;
  waitingRoomCount: number;
  nextAppointment: (Appointment & { patient?: Patient; minutesUntil?: number; countdownText?: string }) | null;
  appointments: (Appointment & { patient?: Patient })[];
  pendingRequests: AppointmentRequest[];
  waitingRoom: WaitingRoomPatient[];
}

export interface SeriesSlotPreview {
  date: string;
  dayOfWeek: number;
  dayName: string;
  time: string;
  startIso: string;
  endIso: string;
  isAvailable: boolean;
  conflictReason?: string;
}

export class AppointmentService {
  private inFlightOperations = new Set<string>();

  constructor(
    private appointmentRepo: IAppointmentRepository,
    private patientRepo: IPatientRepository,
    private requestRepo: IRequestRepository,
    private auditRepo: IAuditRepository,
    private conversationRepo: IConversationRepository,
    private whatsappProvider: IWhatsAppProvider,
    private config: ClinicConfig = DEFAULT_CLINIC_CONFIG,
    private waitlistRepo?: IWaitlistRepository,
    private professionalRepo?: IProfessionalRepository
  ) {}

  public updateConfig(newConfig: ClinicConfig) {
    this.config = newConfig;
  }

  public getConfig(): ClinicConfig {
    return this.config;
  }

  // --------------------------------------------------------------------------
  // Today's Overview & Digital Waiting Room (Sala de Espera Digital)
  // --------------------------------------------------------------------------

  async getTodayOverview(professionalId?: string): Promise<TodayOverviewSummary> {
    const today = getTodayDateString();
    const todayAppointments = await this.appointmentRepo.getTodayAppointments(professionalId);
    const pendingRequests = await this.requestRepo.getPendingRequests(professionalId);
    const patients = await this.patientRepo.getAllPatients();
    const patientMap = new Map<string, Patient>(patients.map((p) => [p.id, p]));

    const enrichedTodayAppointments = todayAppointments.map((app) => ({
      ...app,
      patient: patientMap.get(app.patientId),
    }));

    const now = new Date();
    const nowIso = now.toISOString();

    const completedCount = enrichedTodayAppointments.filter(
      (a) => a.status === AppointmentStatus.COMPLETED
    ).length;

    const remainingCount = enrichedTodayAppointments.filter(
      (a) =>
        a.status === AppointmentStatus.CONFIRMED ||
        a.status === AppointmentStatus.PENDING_APPROVAL ||
        a.status === AppointmentStatus.REQUESTED
    ).length;

    const schedule = await this.getDaySchedule(today, professionalId);
    const freeSlotsCount = schedule.filter((s) => s.isAvailable).length;

    // Pacientes en sala de espera digital (llegaron y todavía no finalizaron)
    const waitingRoom: WaitingRoomPatient[] = [];
    for (const app of enrichedTodayAppointments) {
      if (app.arrivedAt && app.status !== AppointmentStatus.COMPLETED && app.status !== AppointmentStatus.CANCELLED) {
        const patient = app.patient || {
          id: app.patientId,
          firstName: 'Paciente',
          lastName: '',
          phone: '',
          whatsappPhone: '',
          active: true,
          createdAt: today,
        };
        const arrivedTime = new Date(app.arrivedAt).getTime();
        const waitingMinutes = Math.max(0, Math.floor((now.getTime() - arrivedTime) / 60000));
        waitingRoom.push({
          appointment: app,
          patient,
          arrivedAt: app.arrivedAt,
          waitingMinutes,
          isBeingAttended: !!app.sessionStartedAt,
        });
      }
    }
    waitingRoom.sort((a, b) => a.arrivedAt.localeCompare(b.arrivedAt));

    // Próximo turno en llegar / atender
    const upcomingCandidates = enrichedTodayAppointments
      .filter((a) => a.status === AppointmentStatus.CONFIRMED && a.endAt >= nowIso)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));

    let nextAppointmentWithCountdown: (Appointment & { patient?: Patient; minutesUntil?: number; countdownText?: string }) | null = null;
    const nextCandidate = upcomingCandidates[0] || null;
    if (nextCandidate) {
      const diffMs = new Date(nextCandidate.startAt).getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / 60000);

      let countdownText = 'Ahora';
      if (diffMinutes > 0) {
        countdownText = `En ${diffMinutes} min`;
      } else if (diffMinutes < 0) {
        countdownText = 'En curso';
      }

      nextAppointmentWithCountdown = {
        ...nextCandidate,
        minutesUntil: diffMinutes,
        countdownText,
      };
    }

    const clinicStatus = getClinicDailyStatus(this.config, now);

    return {
      dateString: today,
      clinicStatus,
      totalAppointmentsCount: todayAppointments.length,
      completedCount,
      remainingCount,
      freeSlotsCount,
      pendingRequestsCount: pendingRequests.length,
      waitingRoomCount: waitingRoom.length,
      nextAppointment: nextAppointmentWithCountdown,
      appointments: enrichedTodayAppointments,
      pendingRequests,
      waitingRoom,
    };
  }

  // --------------------------------------------------------------------------
  // Acciones Operativas de Sala de Espera
  // --------------------------------------------------------------------------

  async markPatientArrived(appointmentId: string): Promise<Appointment> {
    const nowIso = new Date().toISOString();
    const updated = await this.appointmentRepo.updateAppointment(appointmentId, {
      arrivedAt: nowIso,
    });

    await this.auditRepo.recordEvent({
      actorType: 'STAFF',
      action: 'LLEGADA_PACIENTE',
      entityType: 'APPOINTMENT',
      entityId: appointmentId,
      newData: { arrivedAt: nowIso },
      description: 'El paciente fue registrado en la sala de espera digital.',
    });

    return updated;
  }

  async startSession(appointmentId: string): Promise<Appointment> {
    const nowIso = new Date().toISOString();
    const updated = await this.appointmentRepo.updateAppointment(appointmentId, {
      sessionStartedAt: nowIso,
    });

    await this.auditRepo.recordEvent({
      actorType: 'STAFF',
      action: 'SESION_INICIADA',
      entityType: 'APPOINTMENT',
      entityId: appointmentId,
      newData: { sessionStartedAt: nowIso },
      description: 'Se inició la sesión kinesiológica con el paciente.',
    });

    return updated;
  }

  async finishSession(appointmentId: string): Promise<Appointment> {
    const nowIso = new Date().toISOString();
    const updated = await this.appointmentRepo.updateAppointment(appointmentId, {
      completedAt: nowIso,
      status: AppointmentStatus.COMPLETED,
    });

    await this.auditRepo.recordEvent({
      actorType: 'STAFF',
      action: 'SESION_FINALIZADA',
      entityType: 'APPOINTMENT',
      entityId: appointmentId,
      newData: { completedAt: nowIso, status: AppointmentStatus.COMPLETED },
      description: 'Se finalizó la sesión y se marcó el turno como atendido (COMPLETED).',
    });

    return updated;
  }

  // --------------------------------------------------------------------------
  // Avisar Demora (WhatsApp Operativo Natural)
  // --------------------------------------------------------------------------

  async notifyDelay(
    appointmentId: string,
    minutes: number,
    customMessage?: string
  ): Promise<{ success: boolean; messageText: string; error?: string }> {
    const app = await this.appointmentRepo.getAppointmentById(appointmentId);
    if (!app) {
      return { success: false, messageText: '', error: 'Turno no encontrado.' };
    }

    const patient = await this.patientRepo.getPatientById(app.patientId);
    const patientName = patient ? patient.firstName : 'Paciente';

    const text =
      customMessage ||
      `Hola ${patientName}. Estamos con aproximadamente ${minutes} minutos de demora en el consultorio. Te avisamos para que puedas organizarte mejor. Disculpá la espera.`;

    const channel = patient?.whatsappPhone || app.patientId;
    await this.whatsappProvider.sendTextMessage(channel, text);

    await this.auditRepo.recordEvent({
      actorType: 'STAFF',
      action: 'DEMORA_NOTIFICADA',
      entityType: 'APPOINTMENT',
      entityId: appointmentId,
      newData: { minutesDelay: minutes },
      description: `Se avisó demora de ${minutes} min a ${patientName} por WhatsApp.`,
    });

    return { success: true, messageText: text };
  }

  // --------------------------------------------------------------------------
  // Deterministic Day Schedule Matrix (Multi-Intervalos & Excepciones)
  // --------------------------------------------------------------------------

  async getDaySchedule(
    dateStr: string,
    professionalId: string = 'prof_demo_1',
    customDuration?: number
  ): Promise<DaySlotViewModel[]> {
    const dayStartIso = buildIsoDateTime(dateStr, '00:00');
    const dayEndIso = buildIsoDateTime(dateStr, '23:59');

    const [dayAppointments, scheduleBlocks] = await Promise.all([
      this.appointmentRepo.getAppointmentsByDateRange(dayStartIso, dayEndIso, professionalId),
      this.appointmentRepo.getScheduleBlocks(dayStartIso, dayEndIso, professionalId),
    ]);

    const patients = await this.patientRepo.getAllPatients();
    const patientMap = new Map<string, Patient>(patients.map((p) => [p.id, p]));

    const now = new Date();
    const nowIso = now.toISOString();
    const isToday = dateStr === getTodayDateString();

    const duration = customDuration || this.config.defaultAppointmentDurationMinutes || 45;

    // Verificar si hay excepción para este día
    const exception = this.config.exceptions?.find(
      (ex) =>
        (!ex.professionalId || ex.professionalId === 'ALL' || ex.professionalId === professionalId) &&
        (ex.startDate === dateStr || (ex.endDate && dateStr >= ex.startDate && dateStr <= ex.endDate))
    );

    if (exception && exception.type === 'CLOSED') {
      return []; // Consultorio cerrado por feriado, vacaciones o excepción
    }

    // Determinar franjas horarias
    const dateObj = new Date(`${dateStr}T12:00:00`);
    const dayOfWeek = dateObj.getDay();
    const dayConfig = this.config.workingSchedule?.find((d) => d.dayOfWeek === dayOfWeek);

    if (!dayConfig || !dayConfig.active) {
      return [];
    }

    const intervals = (exception && exception.intervals && exception.intervals.length > 0)
      ? exception.intervals
      : (dayConfig.intervals && dayConfig.intervals.length > 0)
      ? dayConfig.intervals
      : [{ start: dayConfig.start || '08:00', end: dayConfig.end || '19:00' }];

    const slotTimes: string[] = [];

    for (const intv of intervals) {
      const [sh, sm] = intv.start.split(':').map(Number);
      const [eh, em] = intv.end.split(':').map(Number);
      let curr = sh * 60 + sm;
      const endLimit = eh * 60 + em;

      while (curr + duration <= endLimit) {
        const h = Math.floor(curr / 60);
        const m = curr % 60;
        slotTimes.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        curr += duration;
      }
    }

    return slotTimes.map((time) => {
      const startIso = buildIsoDateTime(dateStr, time);
      const endIso = computeEndIso(startIso, duration);

      const appointment = dayAppointments.find((a) => {
        const appTime = parseTimeFromIso(a.startAt);
        return appTime === time && a.status !== AppointmentStatus.CANCELLED;
      });

      const block = scheduleBlocks.find(
        (b) => parseTimeFromIso(b.startAt) === time || (b.startAt <= startIso && b.endAt > startIso)
      );

      const isPast = isToday && endIso < nowIso;
      const isNow = isToday && startIso <= nowIso && endIso >= nowIso;

      return {
        time,
        startIso,
        endIso,
        isAvailable: !appointment && !block,
        isBlocked: !!block,
        blockReason: block?.reason || (block ? 'Horario bloqueado' : undefined),
        isPast,
        isNow,
        appointment,
        patient: appointment ? patientMap.get(appointment.patientId) : undefined,
      };
    });
  }

  async isSlotAvailable(
    date: string,
    time: string,
    durationMinutes: number = 45,
    professionalId: string = 'prof_demo_1'
  ): Promise<boolean> {
    const startIso = buildIsoDateTime(date, time);
    const endIso = computeEndIso(startIso, durationMinutes);
    return this.appointmentRepo.checkAvailability(
      professionalId,
      startIso,
      endIso,
      undefined,
      this.config.bufferBetweenAppointmentsMinutes || 0
    );
  }

  // --------------------------------------------------------------------------
  // Reprogramación Rápida (Primeros horarios disponibles compatibles)
  // --------------------------------------------------------------------------

  async findNextAvailableSlots(
    startDateStr?: string,
    limit: number = 4,
    professionalId: string = 'prof_demo_1',
    duration?: number
  ): Promise<Array<{ date: string; time: string; startIso: string; endIso: string; human: string }>> {
    const results: Array<{ date: string; time: string; startIso: string; endIso: string; human: string }> = [];
    let curr = startDateStr || getTodayDateString();

    for (let dayOffset = 0; dayOffset < 10 && results.length < limit; dayOffset++) {
      const schedule = await this.getDaySchedule(curr, professionalId, duration);
      for (const slot of schedule) {
        if (slot.isAvailable && !slot.isPast) {
          results.push({
            date: curr,
            time: slot.time,
            startIso: slot.startIso,
            endIso: slot.endIso,
            human: `${formatHumanDate(curr)} a las ${slot.time} hs`,
          });
          if (results.length >= limit) break;
        }
      }
      curr = addDays(curr, 1);
    }

    return results;
  }

  async fastRescheduleAppointment(
    appointmentId: string,
    newStartIso: string,
    newEndIso: string
  ): Promise<{ success: boolean; appointment?: Appointment; preparedMessage?: string; error?: string }> {
    const app = await this.appointmentRepo.getAppointmentById(appointmentId);
    if (!app) {
      return { success: false, error: 'Turno no encontrado.' };
    }

    const isAvail = await this.appointmentRepo.checkAvailability(
      app.professionalId,
      newStartIso,
      newEndIso,
      appointmentId
    );

    if (!isAvail) {
      return { success: false, error: 'El horario seleccionado ya no está disponible.' };
    }

    const updated = await this.appointmentRepo.rescheduleAppointment(
      appointmentId,
      newStartIso,
      newEndIso
    );

    const patient = await this.patientRepo.getPatientById(app.patientId);
    const dateHuman = formatHumanDate(parseDateFromIso(newStartIso));
    const timeHuman = formatTimeHs(parseTimeFromIso(newStartIso));
    const patientName = patient ? patient.firstName : 'Paciente';

    const preparedMessage = `Hola ${patientName}, reprogramamos tu turno para el ${dateHuman} a las ${timeHuman} hs. ¡Te esperamos!`;

    if (patient?.whatsappPhone) {
      await this.whatsappProvider.sendTextMessage(patient.whatsappPhone, preparedMessage);
    }

    await this.auditRepo.recordEvent({
      actorType: 'STAFF',
      action: 'TURNO_REPROGRAMADO_RAPIDO',
      entityType: 'APPOINTMENT',
      entityId: appointmentId,
      previousData: { startAt: app.startAt, endAt: app.endAt },
      newData: { startAt: newStartIso, endAt: newEndIso },
      description: `Turno de ${patientName} reprogramado al ${dateHuman} ${timeHuman} hs.`,
    });

    return { success: true, appointment: updated, preparedMessage };
  }

  // --------------------------------------------------------------------------
  // Series de Turnos (AppointmentSeries)
  // --------------------------------------------------------------------------

  async previewSeriesSlots(params: {
    patientId: string;
    professionalId: string;
    startDate: string; // YYYY-MM-DD
    totalWeeks: number;
    daysOfWeek: number[]; // [2, 4]
    timeSlots: { [dayOfWeek: number]: string }; // { 2: "10:00", 4: "10:00" }
    durationMinutes: number;
  }): Promise<{
    totalSlots: number;
    availableCount: number;
    conflictCount: number;
    slots: SeriesSlotPreview[];
  }> {
    const slots: SeriesSlotPreview[] = [];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    for (let w = 0; w < params.totalWeeks; w++) {
      for (const dayOfWeek of params.daysOfWeek) {
        const time = params.timeSlots[dayOfWeek];
        if (!time) continue;

        // Calcular la fecha exacta para esta semana y día
        const baseDate = new Date(`${params.startDate}T12:00:00`);
        const baseDay = baseDate.getDay();
        const diffDays = (dayOfWeek - baseDay + 7) % 7 + w * 7;
        const targetDate = addDays(params.startDate, diffDays);

        const startIso = buildIsoDateTime(targetDate, time);
        const endIso = computeEndIso(startIso, params.durationMinutes);

        const isAvailable = await this.appointmentRepo.checkAvailability(
          params.professionalId,
          startIso,
          endIso
        );

        slots.push({
          date: targetDate,
          dayOfWeek,
          dayName: dayNames[dayOfWeek],
          time,
          startIso,
          endIso,
          isAvailable,
          conflictReason: isAvailable ? undefined : 'Horario ya ocupado por otro turno o bloqueo',
        });
      }
    }

    slots.sort((a, b) => a.startIso.localeCompare(b.startIso));

    const availableCount = slots.filter((s) => s.isAvailable).length;
    const conflictCount = slots.filter((s) => !s.isAvailable).length;

    return {
      totalSlots: slots.length,
      availableCount,
      conflictCount,
      slots,
    };
  }

  async createSeriesAppointments(params: {
    patientId: string;
    professionalId: string;
    appointmentTypeId?: string;
    frequency: SeriesFrequency;
    daysOfWeek: number[];
    timeSlots: { [dayOfWeek: number]: string };
    slotsToCreate: Array<{ startIso: string; endIso: string }>;
    administrativeNotes?: string;
  }): Promise<{
    seriesId: string;
    createdAppointments: Appointment[];
    skippedConflictsCount: number;
  }> {
    const seriesId = `series_${Date.now()}`;
    const createdAppointments: Appointment[] = [];
    let skipped = 0;

    const totalCount = params.slotsToCreate.length;

    for (let i = 0; i < params.slotsToCreate.length; i++) {
      const slot = params.slotsToCreate[i];
      const isAvail = await this.appointmentRepo.checkAvailability(
        params.professionalId,
        slot.startIso,
        slot.endIso
      );

      if (!isAvail) {
        skipped++;
        continue;
      }

      const diffMs = new Date(slot.endIso).getTime() - new Date(slot.startIso).getTime();
      const durationMinutes = Math.round(diffMs / 60000);

      const app = await this.appointmentRepo.createAppointment({
        patientId: params.patientId,
        professionalId: params.professionalId,
        appointmentTypeId: params.appointmentTypeId,
        seriesId,
        seriesIndex: createdAppointments.length + 1,
        seriesTotal: totalCount,
        startAt: slot.startIso,
        endAt: slot.endIso,
        durationMinutes,
        status: AppointmentStatus.CONFIRMED,
        source: 'MANUAL_STAFF',
        confirmationStatus: 'CONFIRMED',
        administrativeNotes: params.administrativeNotes,
      });

      createdAppointments.push(app);
    }

    const patient = await this.patientRepo.getPatientById(params.patientId);
    await this.auditRepo.recordEvent({
      actorType: 'STAFF',
      action: 'SERIE_TURNOS_CREADA',
      entityType: 'APPOINTMENT',
      entityId: seriesId,
      newData: {
        totalRequested: totalCount,
        createdCount: createdAppointments.length,
        skippedConflicts: skipped,
      },
      description: `Serie de ${createdAppointments.length} turnos creada para ${patient ? patient.firstName : 'Paciente'}.`,
    });

    return {
      seriesId,
      createdAppointments,
      skippedConflictsCount: skipped,
    };
  }

  // --------------------------------------------------------------------------
  // Reprogramar Serie (Solo este o este y los siguientes)
  // --------------------------------------------------------------------------

  async rescheduleSeries(
    appointmentId: string,
    newStartIso: string,
    newEndIso: string,
    updateSubsequent: boolean
  ): Promise<{
    success: boolean;
    modifiedCount: number;
    conflictsEncountered: number;
    error?: string;
  }> {
    const currentApp = await this.appointmentRepo.getAppointmentById(appointmentId);
    if (!currentApp) {
      return { success: false, modifiedCount: 0, conflictsEncountered: 0, error: 'Turno no encontrado.' };
    }

    if (!updateSubsequent || !currentApp.seriesId) {
      // Modificar solo este turno
      const res = await this.fastRescheduleAppointment(appointmentId, newStartIso, newEndIso);
      return {
        success: res.success,
        modifiedCount: res.success ? 1 : 0,
        conflictsEncountered: res.success ? 0 : 1,
        error: res.error,
      };
    }

    // Modificar este y los siguientes de la misma serie
    const allPatientApps = await this.appointmentRepo.getPatientActiveAppointments(currentApp.patientId);
    const subsequent = allPatientApps
      .filter((a) => a.seriesId === currentApp.seriesId && a.startAt >= currentApp.startAt)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));

    const timeDiffMs = new Date(newStartIso).getTime() - new Date(currentApp.startAt).getTime();
    let modified = 0;
    let conflicts = 0;

    for (const app of subsequent) {
      const shiftedStart = new Date(new Date(app.startAt).getTime() + timeDiffMs).toISOString();
      const shiftedEnd = new Date(new Date(app.endAt).getTime() + timeDiffMs).toISOString();

      const isAvail = await this.appointmentRepo.checkAvailability(
        app.professionalId,
        shiftedStart,
        shiftedEnd,
        app.id
      );

      if (isAvail) {
        await this.appointmentRepo.rescheduleAppointment(app.id, shiftedStart, shiftedEnd);
        modified++;
      } else {
        conflicts++;
      }
    }

    await this.auditRepo.recordEvent({
      actorType: 'STAFF',
      action: 'SERIE_REPROGRAMADA',
      entityType: 'APPOINTMENT',
      entityId: currentApp.seriesId,
      newData: { modifiedCount: modified, conflictsEncountered: conflicts },
      description: `Reprogramación de serie: ${modified} turnos actualizados (${conflicts} conflictos no movidos).`,
    });

    return {
      success: modified > 0,
      modifiedCount: modified,
      conflictsEncountered: conflicts,
    };
  }

  // --------------------------------------------------------------------------
  // Motor de Matching de Lista de Espera (Waitlist Engine)
  // --------------------------------------------------------------------------

  async findWaitlistMatchesForSlot(slot: {
    professionalId: string;
    startAt: string;
    endAt: string;
    appointmentTypeId?: string;
  }): Promise<Array<WaitlistEntry & { patient: Patient }>> {
    if (!this.waitlistRepo) return [];

    const activeEntries = await this.waitlistRepo.getWaitlistEntries('ACTIVE');
    const dateStr = parseDateFromIso(slot.startAt);
    const timeStr = parseTimeFromIso(slot.startAt);
    const dateObj = new Date(`${dateStr}T12:00:00`);
    const dayOfWeek = dateObj.getDay();

    const [slotH, slotM] = timeStr.split(':').map(Number);
    const slotTotalMin = slotH * 60 + slotM;

    const matches: Array<WaitlistEntry & { patient: Patient }> = [];

    for (const entry of activeEntries) {
      // Filtrar por profesional si la entrada requiere uno puntual
      if (entry.professionalId && entry.professionalId !== slot.professionalId) {
        continue;
      }

      // Filtrar por día de la semana si especificó días preferidos
      if (entry.preferredDays && entry.preferredDays.length > 0 && !entry.preferredDays.includes(dayOfWeek)) {
        continue;
      }

      // Filtrar por rango de fechas
      if (entry.earliestDate && dateStr < entry.earliestDate) continue;
      if (entry.latestDate && dateStr > entry.latestDate) continue;

      // Filtrar por franja horaria preferida
      let matchesTime = true;
      if (entry.preferredTimeRanges && entry.preferredTimeRanges.length > 0) {
        matchesTime = entry.preferredTimeRanges.some((rng) => {
          const [sh, sm] = rng.start.split(':').map(Number);
          const [eh, em] = rng.end.split(':').map(Number);
          return slotTotalMin >= sh * 60 + sm && slotTotalMin <= eh * 60 + em;
        });
      }

      if (matchesTime) {
        const patient = await this.patientRepo.getPatientById(entry.patientId);
        if (patient) {
          matches.push({ ...entry, patient });
        }
      }
    }

    return matches;
  }

  async offerSlotToWaitlistPatient(
    entryId: string,
    slot: { professionalId: string; startAt: string; endAt: string; durationMinutes: number }
  ): Promise<{ success: boolean; offer?: SlotOffer; preparedWhatsAppMessage?: string; error?: string }> {
    if (!this.waitlistRepo) {
      return { success: false, error: 'Módulo de lista de espera no disponible.' };
    }

    const entry = await this.waitlistRepo.getWaitlistEntryById(entryId);
    if (!entry) {
      return { success: false, error: 'Entrada de lista de espera no encontrada.' };
    }

    const patient = await this.patientRepo.getPatientById(entry.patientId);
    if (!patient) {
      return { success: false, error: 'Paciente no encontrado.' };
    }

    const dateHuman = formatHumanDate(parseDateFromIso(slot.startAt));
    const timeHuman = formatTimeHs(parseTimeFromIso(slot.startAt));

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(); // 2 horas

    const offer = await this.waitlistRepo.createSlotOffer({
      waitlistEntryId: entry.id,
      patientId: patient.id,
      professionalId: slot.professionalId,
      slotStartAt: slot.startAt,
      slotEndAt: slot.endAt,
      durationMinutes: slot.durationMinutes,
      expiresAt,
      status: 'PENDING',
    });

    await this.waitlistRepo.updateWaitlistEntry(entry.id, { status: 'OFFERED' });

    const clinicName = this.config.clinicName || 'Consultorio Kinesiológico';
    const messageText = `Hola ${patient.firstName}, se liberó un turno en ${clinicName} para el ${dateHuman} a las ${timeHuman} hs. ¿Te gustaría aprovecharlo? Por favor confirmá respondiendo CONFIRMAR o NO dentro de las próximas 2 horas.`;

    if (patient.whatsappPhone) {
      await this.whatsappProvider.sendTextMessage(patient.whatsappPhone, messageText);
    }

    await this.auditRepo.recordEvent({
      actorType: 'STAFF',
      action: 'TURNO_OFERTADO_LISTA_ESPERA',
      entityType: 'APPOINTMENT',
      entityId: offer.id,
      newData: { patientId: patient.id, slotStartAt: slot.startAt },
      description: `Turno libre del ${dateHuman} ${timeHuman} hs ofertado por WhatsApp a ${patient.firstName} ${patient.lastName}.`,
    });

    return {
      success: true,
      offer,
      preparedWhatsAppMessage: messageText,
    };
  }

  // --------------------------------------------------------------------------
  // Recordatorios Automáticos & Políticas (ReminderEngine)
  // --------------------------------------------------------------------------

  async runAppointmentReminders(): Promise<{
    remindersSentCount: number;
    remindedAppointments: Array<{ appointmentId: string; patientName: string; time: string }>;
  }> {
    const hours = this.config.reminderPolicy?.hoursBeforeAppointment || 24;
    const now = new Date();
    const windowEnd = new Date(now.getTime() + hours * 60 * 60 * 1000).toISOString();
    const nowIso = now.toISOString();

    const rangeAppointments = await this.appointmentRepo.getAppointmentsByDateRange(nowIso, windowEnd);
    const reminded: Array<{ appointmentId: string; patientName: string; time: string }> = [];

    for (const app of rangeAppointments) {
      if (
        app.status === AppointmentStatus.CONFIRMED &&
        !app.reminderSentAt &&
        app.startAt > nowIso
      ) {
        const patient = await this.patientRepo.getPatientById(app.patientId);
        if (!patient) continue;

        const dateHuman = formatHumanDate(parseDateFromIso(app.startAt));
        const timeHuman = formatTimeHs(parseTimeFromIso(app.startAt));

        let text = this.config.reminderPolicy?.templateText ||
          'Hola {patientName}, te recordamos tu turno de kinesiología para el {dateHuman} a las {timeHs} hs. Por favor confirmá tu asistencia respondiendo CONFIRMAR o CANCELAR.';

        text = text
          .replace('{patientName}', patient.firstName)
          .replace('{dateHuman}', dateHuman)
          .replace('{timeHs}', timeHuman);

        if (patient.whatsappPhone) {
          await this.whatsappProvider.sendTextMessage(patient.whatsappPhone, text);
        }

        await this.appointmentRepo.updateAppointment(app.id, {
          reminderSentAt: new Date().toISOString(),
        });

        await this.auditRepo.recordEvent({
          actorType: 'SYSTEM_RULE',
          action: 'RECORDATORIO_ENVIADO',
          entityType: 'APPOINTMENT',
          entityId: app.id,
          description: `Recordatorio de turno enviado a ${patient.firstName} ${patient.lastName} (${dateHuman} ${timeHuman} hs).`,
        });

        reminded.push({
          appointmentId: app.id,
          patientName: `${patient.firstName} ${patient.lastName}`,
          time: `${dateHuman} ${timeHuman} hs`,
        });
      }
    }

    return {
      remindersSentCount: reminded.length,
      remindedAppointments: reminded,
    };
  }

  // --------------------------------------------------------------------------
  // Confirmación del Paciente por WhatsApp (CONFIRMAR / CANCELAR / CAMBIAR)
  // --------------------------------------------------------------------------

  async handlePatientResponse(
    patientId: string,
    rawText: string
  ): Promise<{ handled: boolean; actionTaken: string; replyMessage: string }> {
    const textNorm = rawText.trim().toUpperCase();
    const activeApps = await this.appointmentRepo.getPatientActiveAppointments(patientId);
    const targetApp = activeApps[0];

    if (!targetApp) {
      return {
        handled: false,
        actionTaken: 'NO_ACTIVE_APPOINTMENTS',
        replyMessage: 'Hola, en este momento no encontramos turnos activos programados a tu nombre.',
      };
    }

    const patient = await this.patientRepo.getPatientById(patientId);
    const patientName = patient ? patient.firstName : 'Paciente';

    if (textNorm.includes('CONFIRMAR') || textNorm === '1' || textNorm.includes('CONFIRMO') || textNorm === 'SI') {
      await this.appointmentRepo.updateAppointment(targetApp.id, {
        confirmationStatus: 'CONFIRMED',
      });

      await this.auditRepo.recordEvent({
        actorType: 'PATIENT_ACTION',
        actorId: patientId,
        action: 'CONFIRMACION_RECIBIDA',
        entityType: 'APPOINTMENT',
        entityId: targetApp.id,
        description: `El paciente ${patientName} confirmó su asistencia vía WhatsApp.`,
      });

      const reply = `¡Muchas gracias ${patientName}! Tu asistencia quedó confirmada. Te esperamos en el consultorio.`;
      await this.whatsappProvider.sendTextMessage(patient?.whatsappPhone || patientId, reply);
      return { handled: true, actionTaken: 'CONFIRMED', replyMessage: reply };
    }

    if (textNorm.includes('CANCELAR') || textNorm === '2' || textNorm.includes('CANCELO')) {
      await this.appointmentRepo.cancelAppointment(targetApp.id, 'Cancelado por el paciente por WhatsApp');

      await this.auditRepo.recordEvent({
        actorType: 'PATIENT_ACTION',
        actorId: patientId,
        action: 'CANCELACION_RECIBIDA',
        entityType: 'APPOINTMENT',
        entityId: targetApp.id,
        description: `El paciente ${patientName} canceló su turno vía WhatsApp.`,
      });

      const reply = `Hola ${patientName}, registramos la cancelación de tu turno. Si deseás agendar para otra ocasión, avisanos por acá cuando gustes.`;
      await this.whatsappProvider.sendTextMessage(patient?.whatsappPhone || patientId, reply);
      return { handled: true, actionTaken: 'CANCELLED', replyMessage: reply };
    }

    return {
      handled: false,
      actionTaken: 'UNKNOWN_INTENT',
      replyMessage: 'Respuesta registrada para revisión administrativa.',
    };
  }

  // --------------------------------------------------------------------------
  // Detección de Duplicados & Fusión Manual (Merge Patients)
  // --------------------------------------------------------------------------

  async checkPatientDuplicate(candidate: {
    firstName: string;
    lastName: string;
    phone?: string;
    whatsappPhone?: string;
  }, excludePatientId?: string): Promise<DuplicateCheckResult> {
    const existing = await this.patientRepo.getAllPatients();
    return detectPotentialDuplicatePatient(candidate, existing, excludePatientId);
  }

  async mergePatients(keepPatientId: string, mergePatientId: string): Promise<{ success: boolean; error?: string }> {
    const [keepPatient, mergePatient] = await Promise.all([
      this.patientRepo.getPatientById(keepPatientId),
      this.patientRepo.getPatientById(mergePatientId),
    ]);

    if (!keepPatient || !mergePatient) {
      return { success: false, error: 'Uno o ambos pacientes no existen.' };
    }

    // Reasignar turnos
    const mergeAppointments = await this.appointmentRepo.getPatientActiveAppointments(mergePatientId);
    for (const app of mergeAppointments) {
      await this.appointmentRepo.updateAppointment(app.id, {
        patientId: keepPatientId,
      });
    }

    // Desactivar paciente secundario
    await this.patientRepo.updatePatient(mergePatientId, {
      active: false,
      administrativeNotes: `Fusionado con paciente principal ${keepPatient.firstName} ${keepPatient.lastName} (${keepPatientId}).`,
    });

    await this.auditRepo.recordEvent({
      actorType: 'STAFF',
      action: 'PACIENTES_FUSIONADOS',
      entityType: 'PATIENT',
      entityId: keepPatientId,
      description: `Fusión de pacientes: ${mergePatient.firstName} ${mergePatient.lastName} fusionado en ${keepPatient.firstName} ${keepPatient.lastName}.`,
    });

    return { success: true };
  }

  // --------------------------------------------------------------------------
  // Existing Request Approval / Rejection (Backward Compatibility with Tests)
  // --------------------------------------------------------------------------

  async approveRequest(requestId: string, resolvedBy: string = 'STAFF'): Promise<{
    success: boolean;
    error?: string;
    preparedWhatsAppMessage?: string;
  }> {
    const opKey = `approve_${requestId}`;
    if (this.inFlightOperations.has(opKey)) {
      return { success: false, error: 'La operación está siendo procesada.' };
    }

    try {
      this.inFlightOperations.add(opKey);

      const request = await this.requestRepo.getRequestById(requestId);
      if (!request) {
        return { success: false, error: 'Solicitud no encontrada.' };
      }

      if (request.status !== RequestStatus.PENDING) {
        return { success: false, error: 'Esta solicitud ya fue resuelta previamente.' };
      }

      const patient = await this.patientRepo.getPatientById(request.patientId);
      const patientName = patient ? patient.firstName : 'Paciente';

      if (request.type === RequestType.CHANGE || request.type === RequestType.CREATE) {
        if (!request.requestedStartAt || !request.requestedEndAt) {
          return { success: false, error: 'La solicitud no contiene horario especificado.' };
        }

        const isAvailable = await this.appointmentRepo.checkAvailability(
          request.professionalId,
          request.requestedStartAt,
          request.requestedEndAt,
          request.currentAppointmentId,
          this.config.bufferBetweenAppointmentsMinutes || 0
        );

        if (!isAvailable) {
          return {
            success: false,
            error: 'Este horario acaba de dejar de estar disponible. Podés proponer otra opción.',
          };
        }
      }

      let targetAppointment: Appointment | undefined;

      if (request.type === RequestType.CHANGE && request.currentAppointmentId) {
        targetAppointment = await this.appointmentRepo.rescheduleAppointment(
          request.currentAppointmentId,
          request.requestedStartAt!,
          request.requestedEndAt!
        );
      } else if (request.type === RequestType.CREATE) {
        targetAppointment = await this.appointmentRepo.createAppointment({
          patientId: request.patientId,
          professionalId: request.professionalId,
          startAt: request.requestedStartAt!,
          endAt: request.requestedEndAt!,
          durationMinutes: this.config.defaultAppointmentDurationMinutes || 45,
          status: AppointmentStatus.CONFIRMED,
          source: 'WHATSAPP_AI',
        });
      } else if (request.type === RequestType.CANCEL && request.currentAppointmentId) {
        targetAppointment = await this.appointmentRepo.cancelAppointment(
          request.currentAppointmentId,
          'Cancelación solicitada por el paciente'
        );
      }

      await this.requestRepo.updateRequestStatus(requestId, RequestStatus.APPROVED, {
        resolvedBy,
        resolutionNote: 'Aprobado por el profesional',
      });

      await this.auditRepo.recordEvent({
        actorType: 'STAFF',
        actorId: resolvedBy,
        action: `SOLICITUD_${request.type}_APROBADA`,
        entityType: 'REQUEST',
        entityId: requestId,
        newData: { targetAppointmentId: targetAppointment?.id },
        description: `Solicitud de ${request.type} de ${patientName} aprobada.`,
      });

      let messageContent = '';
      if (request.requestedStartAt) {
        const reqDateHuman = formatHumanDate(parseDateFromIso(request.requestedStartAt));
        const reqTimeHuman = formatTimeHs(parseTimeFromIso(request.requestedStartAt));

        if (request.type === RequestType.CHANGE) {
          messageContent = `¡Hola ${patientName}! Tu turno fue reprogramado con éxito para el ${reqDateHuman} a las ${reqTimeHuman} hs. ¡Te esperamos!`;
        } else if (request.type === RequestType.CREATE) {
          messageContent = `¡Hola ${patientName}! Tu turno para el ${reqDateHuman} a las ${reqTimeHuman} hs quedó confirmado. ¡Te esperamos en el consultorio!`;
        }
      } else if (request.type === RequestType.CANCEL) {
        messageContent = `Hola ${patientName}, confirmamos que tu turno fue cancelado. Cuando desees agendar nuevamente, avisanos por acá.`;
      }

      if (patient?.whatsappPhone && messageContent) {
        await this.whatsappProvider.sendMessage(patient.whatsappPhone, messageContent);
      }

      return {
        success: true,
        preparedWhatsAppMessage: messageContent,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      this.inFlightOperations.delete(opKey);
    }
  }

  async rejectRequest(
    requestId: string,
    reason: string,
    resolvedBy: string = 'STAFF'
  ): Promise<{ success: boolean; error?: string; preparedWhatsAppMessage?: string }> {
    const request = await this.requestRepo.getRequestById(requestId);
    if (!request) return { success: false, error: 'Solicitud no encontrada.' };
    if (request.status !== RequestStatus.PENDING) return { success: false, error: 'La solicitud ya fue resuelta.' };

    const patient = await this.patientRepo.getPatientById(request.patientId);
    const patientName = patient ? patient.firstName : 'Paciente';

    await this.requestRepo.updateRequestStatus(requestId, RequestStatus.REJECTED, {
      resolvedBy,
      resolutionNote: reason,
    });

    await this.auditRepo.recordEvent({
      actorType: 'STAFF',
      actorId: resolvedBy,
      action: `SOLICITUD_${request.type}_RECHAZADA`,
      entityType: 'REQUEST',
      entityId: requestId,
      description: `Solicitud de ${request.type} rechazada: ${reason}`,
    });

    const messageContent = `Hola ${patientName}, lamentablemente no fue posible confirmar tu solicitud de turno para ese horario (${reason}). ¿Querés que busquemos otra opción disponible?`;
    if (patient?.whatsappPhone) {
      await this.whatsappProvider.sendMessage(patient.whatsappPhone, messageContent);
    }

    return { success: true, preparedWhatsAppMessage: messageContent };
  }

  async proposeAlternative(
    requestId: string,
    altStartIso: string,
    altEndIso: string,
    resolvedBy: string = 'STAFF'
  ): Promise<{ success: boolean; error?: string; preparedWhatsAppMessage?: string }> {
    const request = await this.requestRepo.getRequestById(requestId);
    if (!request) return { success: false, error: 'Solicitud no encontrada.' };

    const isAvailable = await this.appointmentRepo.checkAvailability(
      request.professionalId,
      altStartIso,
      altEndIso,
      undefined,
      this.config.bufferBetweenAppointmentsMinutes || 0
    );

    if (!isAvailable) {
      return {
        success: false,
        error: 'La alternativa propuesta no está disponible en este momento. Por favor seleccioná otro horario.',
      };
    }

    const patient = await this.patientRepo.getPatientById(request.patientId);
    const patientName = patient ? patient.firstName : 'Paciente';
    const altDateHuman = formatHumanDate(parseDateFromIso(altStartIso));
    const altTimeHuman = formatTimeHs(parseTimeFromIso(altStartIso));

    await this.requestRepo.updateRequestStatus(requestId, RequestStatus.PROPOSED_ALTERNATIVE, {
      resolvedBy,
      resolutionNote: `Propuesto: ${altDateHuman} ${altTimeHuman}`,
      proposedAlternativeStartAt: altStartIso,
      proposedAlternativeEndAt: altEndIso,
    });

    await this.auditRepo.recordEvent({
      actorType: 'STAFF',
      actorId: resolvedBy,
      action: 'ALTERNATIVA_PROPUESTA',
      entityType: 'REQUEST',
      entityId: requestId,
      newData: { altStartIso, altEndIso },
      description: `Se propuso horario alternativo (${altDateHuman} ${altTimeHuman}) a ${patientName}.`,
    });

    const profName = this.config.professionalDisplayName || 'el Profesional';
    const messageContent = `Hola ${patientName}, para ese día ${profName} te propone el horario del ${altDateHuman} a las ${altTimeHuman}. ¿Te queda bien ese turno?`;

    if (patient?.whatsappPhone) {
      await this.whatsappProvider.sendMessage(patient.whatsappPhone, messageContent);
    }

    return { success: true, preparedWhatsAppMessage: messageContent };
  }

  async createManualAppointment(data: {
    patientId: string;
    professionalId: string;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    appointmentTypeId?: string;
    resourceId?: string;
    administrativeNotes?: string;
  }): Promise<{ success: boolean; appointment?: Appointment; error?: string }> {
    const locked = await this.appointmentRepo.acquireSlotLock(data.professionalId, data.startAt);
    if (!locked) {
      return {
        success: false,
        error: 'Este horario está siendo reservado en este momento. Intente con otro horario.',
      };
    }

    try {
      const isAvailable = await this.appointmentRepo.checkAvailability(
        data.professionalId,
        data.startAt,
        data.endAt,
        undefined,
        this.config.bufferBetweenAppointmentsMinutes || 0
      );

      if (!isAvailable) {
        return {
          success: false,
          error: 'Conflicto de horario: El profesional ya tiene un turno o bloqueo en ese rango.',
        };
      }

      const appointment = await this.appointmentRepo.createAppointment({
        ...data,
        status: AppointmentStatus.CONFIRMED,
        source: 'MANUAL_STAFF',
        confirmationStatus: 'CONFIRMED',
      });

      await this.auditRepo.recordEvent({
        actorType: 'STAFF',
        action: 'TURNO_MANUAL_CREADO',
        entityType: 'APPOINTMENT',
        entityId: appointment.id,
        description: `Turno manual creado para paciente ${data.patientId} el ${data.startAt}.`,
      });

      return { success: true, appointment };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      await this.appointmentRepo.releaseSlotLock(data.professionalId, data.startAt);
    }
  }

  async updateStatus(
    appointmentId: string,
    status: AppointmentStatus,
    reason?: string
  ): Promise<Appointment> {
    const updated = await this.appointmentRepo.updateAppointmentStatus(appointmentId, status, reason);
    await this.auditRepo.recordEvent({
      actorType: 'STAFF',
      action: 'ESTADO_TURNO_MODIFICADO',
      entityType: 'APPOINTMENT',
      entityId: appointmentId,
      newData: { status },
      description: `Estado de turno modificado a ${status}.`,
    });
    return updated;
  }

  async createScheduleBlock(data: {
    professionalId: string;
    startAt: string;
    endAt: string;
    reason?: string;
  }): Promise<{ success: boolean; block?: ScheduleBlock; error?: string }> {
    const opKey = `block_${data.professionalId}_${data.startAt}_${data.endAt}`;
    if (this.inFlightOperations.has(opKey)) {
      return { success: false, error: 'Esta operación ya está siendo procesada.' };
    }

    try {
      this.inFlightOperations.add(opKey);

      const isAvailable = await this.appointmentRepo.checkAvailability(
        data.professionalId,
        data.startAt,
        data.endAt
      );

      if (!isAvailable) {
        return {
          success: false,
          error: 'No se puede bloquear este horario porque ya tiene un turno o bloqueo asignado.',
        };
      }

      const block = await this.appointmentRepo.createScheduleBlock(data);

      await this.auditRepo.recordEvent({
        actorType: 'STAFF',
        action: 'HORARIO_BLOQUEADO',
        entityType: 'SLOT',
        entityId: block.id,
        description: `Horario bloqueado del ${data.startAt} al ${data.endAt} (${data.reason || 'Sin motivo'}).`,
      });

      return { success: true, block };
    } catch (err: any) {
      return { success: false, error: err.message };
    } finally {
      this.inFlightOperations.delete(opKey);
    }
  }

  async removeScheduleBlock(blockId: string): Promise<void> {
    await this.appointmentRepo.removeScheduleBlock(blockId);
    await this.auditRepo.recordEvent({
      actorType: 'STAFF',
      action: 'HORARIO_DESBLOQUEADO',
      entityType: 'SLOT',
      entityId: blockId,
      description: `Bloqueo de horario ${blockId} eliminado.`,
    });
  }
}
