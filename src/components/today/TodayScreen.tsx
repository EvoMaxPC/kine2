import React, { useState } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import {
  formatHumanDate,
  formatTimeHs,
  parseTimeFromIso,
  parseDateFromIso,
} from '../../utils/dateUtils.ts';
import { StatusBadge } from '../../design-system/components/StatusBadge.tsx';
import {
  Clock,
  Calendar,
  Users,
  Inbox,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  MessageCircle,
  Send,
  Lock,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  Sparkles,
  ArrowRight,
  Filter,
  Activity,
  Play,
  Check,
  RotateCw,
  Repeat,
  TrendingUp,
  Radio,
  Zap,
  CalendarCheck2,
  BellRing,
  Phone,
  DollarSign,
} from 'lucide-react';
import { Appointment, AppointmentRequest, AppointmentStatus } from '../../types/index.ts';
import { ProposeAlternativeModal } from '../requests/ProposeAlternativeModal.tsx';
import { CancelConfirmModal } from '../shared/CancelConfirmModal.tsx';
import { PreparedWhatsAppModal } from '../shared/PreparedWhatsAppModal.tsx';
import { AvisarDemoraModal } from '../shared/AvisarDemoraModal.tsx';
import { FastRescheduleModal } from '../shared/FastRescheduleModal.tsx';
import { ClinicDelayBroadcastModal } from '../shared/ClinicDelayBroadcastModal.tsx';
import { DailyClosingSummaryModal } from '../shared/DailyClosingSummaryModal.tsx';
import { DailyBriefingService } from '../../services/DailyBriefingService.ts';
import { NextBestActionService } from '../../services/NextBestActionService.ts';

export const TodayScreen: React.FC = () => {
  const {
    todayOverview,
    daySchedule,
    allRequests,
    config,
    professionals,
    selectedProfessionalId,
    setSelectedProfessionalId,
    setActiveTab,
    setSelectedDate,
    approveRequest,
    rejectRequest,
    updateAppointmentStatus,
    cancelAppointment,
    markPatientArrived,
    startSession,
    finishSession,
    setIsNewAppointmentModalOpen,
    setNewAppointmentInitialSlot,
    setIsBlockSlotModalOpen,
    setBlockSlotInitialData,
    setIsWhatsAppDrawerOpen,
    setActiveWhatsAppPatientId,
    pendingDecisionsCount,
    decisions,
    waitlistEntries,
    runAppointmentReminders,
    showToast,
    activeKineAlert,
    setActiveKineAlert,
    confirmAlertRequest,
  } = useKineStore();

  const [proposeModalReq, setProposeModalReq] = useState<AppointmentRequest | null>(null);
  const [cancelModalApp, setCancelModalApp] = useState<{ id: string; name?: string; time?: string } | null>(null);
  const [delayModalApp, setDelayModalApp] = useState<Appointment | null>(null);
  const [rescheduleModalApp, setRescheduleModalApp] = useState<Appointment | null>(null);
  const [isClinicDelayModalOpen, setIsClinicDelayModalOpen] = useState<boolean>(false);
  const [isClosingSummaryOpen, setIsClosingSummaryOpen] = useState<boolean>(false);
  const [isBriefingExpanded, setIsBriefingExpanded] = useState<boolean>(true);
  const [preparedModalData, setPreparedModalData] = useState<{
    isOpen: boolean;
    message: string;
    phone: string;
    patientName: string;
  }>({ isOpen: false, message: '', phone: '', patientName: '' });

  const [timelineFilter, setTimelineFilter] = useState<'todos' | 'ocupados' | 'libres'>('todos');

  if (!todayOverview) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-teal-700 border-t-transparent animate-spin"></div>
          <span className="text-xs text-stone-500 font-medium">Cargando jornada...</span>
        </div>
      </div>
    );
  }

  // Daily Briefing (Max 5 points)
  const briefing = DailyBriefingService.generateBriefing(todayOverview, daySchedule);

  // Next Best Action (Single crisp operational action)
  const nextBestAction = NextBestActionService.evaluateNextAction(
    todayOverview,
    decisions,
    waitlistEntries
  );

  const handleNextBestActionClick = async () => {
    if (!nextBestAction) return;

    switch (nextBestAction.actionType) {
      case 'START_SESSION':
        if (nextBestAction.payload?.appointmentId) {
          await startSession(nextBestAction.payload.appointmentId);
        }
        break;
      case 'DECISION_CENTER':
        setActiveTab('decisiones');
        break;
      case 'SEND_REMINDERS':
        await runAppointmentReminders();
        break;
      case 'WAITLIST_OFFER':
        setActiveTab('espera');
        break;
      case 'CLINIC_DELAY':
        setIsClinicDelayModalOpen(true);
        break;
      default:
        break;
    }
  };

  const handleQuickApprove = async (req: AppointmentRequest) => {
    const res = await approveRequest(req.id);
    if (res && typeof res === 'object' && (res as any).message) {
      const p = todayOverview.appointments.find((a) => a.patientId === req.patientId)?.patient;
      if (p) {
        setPreparedModalData({
          isOpen: true,
          message: (res as any).message,
          phone: p.whatsappPhone || p.phone,
          patientName: p.firstName,
        });
      }
    }
  };

  const handleQuickReject = async (req: AppointmentRequest) => {
    await rejectRequest(req.id, 'Horario no disponible en agenda');
  };

  // Filter timeline items
  const filteredSchedule = daySchedule.filter((slot) => {
    if (timelineFilter === 'ocupados') return !!slot.appointment;
    if (timelineFilter === 'libres') return slot.isAvailable;
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* ========================================================================= */}
      {/* TOP HEADER: CLINIC STATUS & PROFESSIONAL SELECTOR                         */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#121B17] border border-stone-200/80 dark:border-stone-800/80 rounded-3xl p-6 sm:p-7 shadow-[0_2px_12px_-4px_rgba(13,92,82,0.06)] relative overflow-hidden transition-colors duration-200">
        <div className="absolute top-0 right-0 w-80 h-32 bg-gradient-to-bl from-teal-50/70 via-emerald-50/20 to-transparent dark:from-teal-950/40 dark:via-emerald-950/10 pointer-events-none rounded-tr-3xl"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{formatHumanDate(todayOverview.dateString)}</span>
              <span className="text-stone-300 dark:text-stone-700">·</span>
              <span className="text-stone-500 dark:text-stone-400 font-normal">{config.clinicName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
              Panel Operativo del Día
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
              {todayOverview.clinicStatus.text}
            </p>
          </div>

          {/* Quick Actions Header: Delay Notice + Daily Closing + Professional */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsClinicDelayModalOpen(true)}
              className="px-3 py-1.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200/70 dark:border-amber-800 text-xs font-bold transition-all hover:bg-amber-100 flex items-center gap-1.5 shadow-2xs active:scale-95"
              title="Avisar demora masiva del consultorio a los próximos turnos"
            >
              <Radio className="w-3.5 h-3.5 text-amber-600" />
              <span>Avisar Demora</span>
            </button>

            <button
              onClick={() => setIsClosingSummaryOpen(true)}
              className="px-3 py-1.5 rounded-2xl bg-stone-100 dark:bg-stone-800/80 text-stone-700 dark:text-stone-200 border border-stone-200/70 dark:border-stone-700 text-xs font-bold transition-all hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center gap-1.5 shadow-2xs active:scale-95"
              title="Ver balance y resumen de cierre del día"
            >
              <CalendarCheck2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Cierre del Día</span>
            </button>

            {/* Professional Filter */}
            <div className="flex items-center gap-2 bg-stone-50 dark:bg-[#15221C] px-3 py-1.5 rounded-2xl border border-stone-200/60 dark:border-stone-800">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={selectedProfessionalId}
                onChange={(e) => setSelectedProfessionalId(e.target.value)}
                className="text-xs font-bold bg-transparent text-stone-800 dark:text-stone-200 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Todos los profesionales</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 4 Métricas Clave Operativas + Recuperación Económica */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-stone-100 dark:border-stone-800/80">
          <div className="bg-stone-50/70 dark:bg-[#15221C] p-3.5 rounded-2xl border border-stone-200/50 dark:border-stone-800/60">
            <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
              Turnos Hoy
            </div>
            <div className="text-2xl font-black text-stone-900 dark:text-white mt-1 tabular-nums">
              {todayOverview.totalAppointmentsCount}
            </div>
            <div className="text-[10px] text-teal-700 dark:text-teal-300 font-medium mt-0.5">
              {todayOverview.completedCount} completados
            </div>
          </div>

          <div className="bg-stone-50/70 dark:bg-[#15221C] p-3.5 rounded-2xl border border-stone-200/50 dark:border-stone-800/60">
            <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
              En Sala de Espera
            </div>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
              {todayOverview.waitingRoomCount}
            </div>
            <div className="text-[10px] text-stone-400 font-medium mt-0.5">
              Esperando atención
            </div>
          </div>

          <div className="bg-stone-50/70 dark:bg-[#15221C] p-3.5 rounded-2xl border border-stone-200/50 dark:border-stone-800/60">
            <div className="text-[11px] font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
              Horarios Libres
            </div>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
              {todayOverview.freeSlotsCount}
            </div>
            <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium mt-0.5">
              Disponibles para asignar
            </div>
          </div>

          <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-200/60 dark:border-amber-900/40">
            <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-amber-600" />
              <span>Recuperados Waitlist</span>
            </div>
            <div className="text-2xl font-black text-amber-900 dark:text-amber-200 mt-1 tabular-nums">
              1 <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">turno</span>
            </div>
            <div className="text-[10px] text-amber-700 dark:text-amber-300 font-bold mt-0.5">
              +$14.000 generados
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECCIÓN PRIORITARIA OBLIGATORIA (Prompt Maestro 01):                      */}
      {/* Próximo Turno · Demora Actual · Alertas Pendientes                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 1. PRÓXIMO TURNO */}
        <div className="lg:col-span-2 bg-white dark:bg-[#121B17] border-2 border-teal-500/30 dark:border-teal-500/20 rounded-3xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-bl from-teal-500/10 to-transparent pointer-events-none rounded-tr-3xl" />
          
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-extrabold uppercase tracking-wide">
                <Clock className="w-3.5 h-3.5" />
                <span>Próximo Turno de Hoy</span>
              </div>
              {todayOverview.nextAppointment && (
                <span className="text-xs font-mono font-bold text-teal-700 dark:text-teal-300 bg-teal-100/60 dark:bg-teal-950/60 px-2.5 py-1 rounded-xl">
                  {todayOverview.nextAppointment.countdownText || 'A continuación'}
                </span>
              )}
            </div>

            {todayOverview.nextAppointment ? (
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-stone-900 dark:text-white flex items-center gap-2">
                      <span>
                        {todayOverview.nextAppointment.patient?.firstName} {todayOverview.nextAppointment.patient?.lastName}
                      </span>
                      <StatusBadge status={todayOverview.nextAppointment.status} />
                    </h3>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400 mt-1">
                      <span className="font-mono font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        {formatTimeHs(parseTimeFromIso(todayOverview.nextAppointment.startAt))} hs
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-stone-400" />
                        {todayOverview.nextAppointment.patient?.whatsappPhone || todayOverview.nextAppointment.patient?.phone || 'Sin WhatsApp'}
                      </span>
                      {todayOverview.nextAppointment.patient?.insurance && (
                        <>
                          <span>·</span>
                          <span className="text-teal-700 dark:text-teal-300 font-medium">
                            {todayOverview.nextAppointment.patient.insurance}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => markPatientArrived(todayOverview.nextAppointment!.id)}
                      className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Marcar Llegada</span>
                    </button>
                    <button
                      onClick={() => setDelayModalApp(todayOverview.nextAppointment!)}
                      className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800 text-xs font-bold transition-all flex items-center gap-1"
                    >
                      <span>Avisar Demora</span>
                    </button>
                    <button
                      onClick={() => {
                        setActiveWhatsAppPatientId(todayOverview.nextAppointment!.patientId);
                        setIsWhatsAppDrawerOpen(true);
                      }}
                      className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 transition-all"
                      title="Abrir WhatsApp con paciente"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {todayOverview.nextAppointment.administrativeNotes && (
                  <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/60 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300">
                    <span className="font-semibold text-stone-800 dark:text-stone-200">Nota administrativa:</span>{' '}
                    {todayOverview.nextAppointment.administrativeNotes}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-stone-400 dark:text-stone-500 bg-stone-50/50 dark:bg-[#15221C] rounded-2xl border border-dashed border-stone-200 dark:border-stone-800">
                No hay más turnos programados pendientes para el resto del día.
              </div>
            )}
          </div>
        </div>

        {/* 2. DEMORA ACTUAL & ALERTAS PENDIENTES */}
        <div className="space-y-4 flex flex-col justify-between">
          {/* Tarjeta de Demora Actual */}
          <div className="bg-white dark:bg-[#121B17] border border-amber-300/70 dark:border-amber-800/60 rounded-3xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-amber-600" />
                <span>Demora Actual</span>
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                  (config.currentDelayMinutes || 0) > 0
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                }`}
              >
                {(config.currentDelayMinutes || 0) > 0
                  ? `+${config.currentDelayMinutes} min de retraso`
                  : 'A horario (0 min)'}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              La secretaria digital informa este valor a los pacientes que consulten por WhatsApp.
            </p>
            <button
              onClick={() => setIsClinicDelayModalOpen(true)}
              className="mt-3 w-full py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold transition-all text-center"
            >
              Modificar / Notificar Demora Masiva
            </button>
          </div>

          {/* Tarjeta de Alertas Pendientes */}
          <div className="bg-white dark:bg-[#121B17] border border-stone-200/80 dark:border-stone-800 rounded-3xl p-4 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                <BellRing className="w-3.5 h-3.5 text-amber-500" />
                <span>Alertas Pendientes</span>
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  activeKineAlert || pendingDecisionsCount > 0
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 animate-pulse'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                }`}
              >
                {activeKineAlert ? '1 URGENTE' : pendingDecisionsCount > 0 ? `${pendingDecisionsCount} pendientes` : '0 pendientes'}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {activeKineAlert
                ? `Nueva solicitud de ${activeKineAlert.patientName} esperando confirmación.`
                : pendingDecisionsCount > 0
                ? 'Casos que requieren tu aprobación profesional antes de responder.'
                : 'Sin alertas pendientes que requieran intervención en este momento.'}
            </p>
            {activeKineAlert ? (
              <button
                onClick={() => {}}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold transition-all text-center flex items-center justify-center gap-1.5 animate-bounce"
              >
                <BellRing className="w-3.5 h-3.5" />
                <span>Resolver Alerta Activa Ahora</span>
              </button>
            ) : pendingDecisionsCount > 0 ? (
              <button
                onClick={() => setActiveTab('decisiones')}
                className="mt-3 w-full py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 text-xs font-bold transition-all text-center"
              >
                Ir a Decision Center ({pendingDecisionsCount})
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 25. RESUMEN DE INICIO DE JORNADA (DailyBriefingService - Max 5 puntos)     */}
      {/* ========================================================================= */}
      {briefing.items.length > 0 && (
        <div className="bg-white dark:bg-[#121B17] border border-teal-200/70 dark:border-teal-900/50 rounded-3xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                  <span>Resumen de Inicio de Jornada</span>
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.2 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                    Briefing Operativo
                  </span>
                </h3>
              </div>
            </div>

            <button
              onClick={() => setIsBriefingExpanded((prev) => !prev)}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              {isBriefingExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {isBriefingExpanded && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {briefing.items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-stone-50 dark:bg-[#16221C] border border-stone-200/60 dark:border-stone-800/80 flex items-center gap-3 text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400 shrink-0" />
                  <div className="text-stone-700 dark:text-stone-200 font-medium">
                    {item.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 27. NEXT BEST ACTION (NextBestActionService - Un único bloque focalizado) */}
      {/* ========================================================================= */}
      {nextBestAction && (
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-stone-900 text-white rounded-3xl p-5 sm:p-6 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in duration-200">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-teal-700/80 border border-teal-500/40 text-teal-200 flex items-center justify-center shrink-0 shadow-xs">
              <Zap className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-extrabold uppercase tracking-wider text-teal-300">
                  Siguiente Mejor Acción Recomendada · KineOS
                </span>
                <span className="text-2xs px-2 py-0.5 rounded-full font-bold bg-amber-400 text-stone-950">
                  {nextBestAction.badge}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {nextBestAction.title}
              </h3>
              <p className="text-xs text-teal-100/80 mt-0.5">
                {nextBestAction.description}
              </p>
            </div>
          </div>

          <button
            onClick={handleNextBestActionClick}
            className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-extrabold text-xs inline-flex items-center gap-2 shrink-0 shadow-xs transition-transform active:scale-95"
          >
            <span>{nextBestAction.actionButtonText}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* KINEOS DECISION ALERT BANNER (Prompt Maestro 04)                         */}
      {/* ========================================================================= */}
      {pendingDecisionsCount > 0 && (
        <div className="bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/40 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Decision Center · KineOS
                </span>
                <span className="text-2xs px-2 py-0.5 rounded-full font-bold bg-amber-500 text-white">
                  {pendingDecisionsCount} pendientes
                </span>
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white mt-0.5">
                Hay {pendingDecisionsCount} situación{pendingDecisionsCount > 1 ? 'es' : ''} que requiere{pendingDecisionsCount > 1 ? 'n' : ''} tu aprobación profesional
              </h3>
              <p className="text-xs text-stone-600 dark:text-stone-300 mt-0.5">
                El motor ya preparó las mejores propuestas en 1 clic (reprogramación, excepciones, sobreturnos o waitlist).
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('decisiones')}
            className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs inline-flex items-center gap-2 shrink-0 shadow-xs transition-transform active:scale-95"
          >
            <span>Resolver en Decision Center</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SALA DE ESPERA DIGITAL (Regla 17)                                         */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#121B17] border border-amber-200/60 dark:border-amber-950/60 rounded-3xl p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span>Sala de Espera Digital</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold">
                  {todayOverview.waitingRoom.length} presentes
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Pacientes que llegaron a recepción y están esperando o en atención.
              </p>
            </div>
          </div>
        </div>

        {todayOverview.waitingRoom.length === 0 ? (
          <div className="py-6 text-center text-xs text-stone-400 dark:text-stone-500 bg-stone-50/50 dark:bg-[#15221C] rounded-2xl border border-dashed border-stone-200 dark:border-stone-800">
            No hay pacientes en sala de espera en este momento. Hacé click en "Llegó" en cualquier turno de hoy cuando ingrese un paciente.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayOverview.waitingRoom.map((w) => (
              <div
                key={w.appointment.id}
                className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-extrabold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                        <span>{w.patient.firstName} {w.patient.lastName}</span>
                        {w.isBeingAttended && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                            En atención
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        Llegó {formatTimeHs(parseTimeFromIso(w.arrivedAt))} hs · Espera: <strong>{w.waitingMinutes} min</strong>
                      </div>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border border-stone-200/60 dark:border-stone-800">
                      {formatTimeHs(parseTimeFromIso(w.appointment.startAt))} hs
                    </span>
                  </div>

                  {w.patient.insurance && (
                    <div className="text-xs text-stone-600 dark:text-stone-400 mt-2 flex items-center gap-1.5">
                      <span>Cobertura: {w.patient.insurance}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-amber-200/50 dark:border-amber-900/40 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setDelayModalApp(w.appointment)}
                    className="text-xs font-semibold text-amber-900 dark:text-amber-300 hover:underline"
                  >
                    Avisar demora
                  </button>

                  <div className="flex items-center gap-1.5">
                    {!w.isBeingAttended ? (
                      <button
                        onClick={() => startSession(w.appointment.id)}
                        className="px-3 py-1.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl flex items-center gap-1 transition-all shadow-xs"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Iniciar Sesión</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => finishSession(w.appointment.id)}
                        className="px-3 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl flex items-center gap-1 transition-all shadow-xs"
                      >
                        <Check className="w-3 h-3" />
                        <span>Finalizar</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SOLICITUDES PENDIENTES DE RESPUESTA POR WHATSAPP                          */}
      {/* ========================================================================= */}
      {todayOverview.pendingRequests.length > 0 && (
        <div className="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-3xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Inbox className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                {todayOverview.pendingRequests.length} Solicitud(es) de pacientes por responder
              </h2>
            </div>
            <button
              onClick={() => setActiveTab('solicitudes')}
              className="text-xs font-semibold text-amber-800 dark:text-amber-300 hover:underline"
            >
              Ver todas
            </button>
          </div>

          <div className="space-y-2.5">
            {todayOverview.pendingRequests.map((req) => (
              <div
                key={req.id}
                className="bg-white dark:bg-[#121B17] p-3.5 rounded-2xl border border-amber-200/60 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {req.patientMessage || 'Solicitud de turno por WhatsApp'}
                  </div>
                  <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    {req.requestedStartAt
                      ? `${formatHumanDate(parseDateFromIso(req.requestedStartAt))} a las ${formatTimeHs(parseTimeFromIso(req.requestedStartAt))} hs`
                      : 'Horario a coordinar'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleQuickReject(req)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 rounded-xl hover:bg-rose-100 transition-colors"
                  >
                    Rechazar
                  </button>
                  <button
                    onClick={() => setProposeModalReq(req)}
                    className="px-3 py-1.5 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 rounded-xl hover:bg-stone-200 transition-colors"
                  >
                    Proponer otro
                  </button>
                  <button
                    onClick={() => handleQuickApprove(req)}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Aprobar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TIMELINE DEL DÍA: TODOS LOS TURNOS Y ACCIONES OPERATIVAS                  */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-[#121B17] border border-stone-200/80 dark:border-stone-800/80 rounded-3xl p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Agenda Cronológica de Hoy
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Visualización limpia de turnos reservados, espacios disponibles y bloqueos.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(['todos', 'ocupados', 'libres'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimelineFilter(filter)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition-all ${
                  timelineFilter === filter
                    ? 'bg-stone-900 text-white dark:bg-teal-700'
                    : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Listado Timeline */}
        <div className="space-y-3">
          {filteredSchedule.map((slot, idx) => {
            const app = slot.appointment;
            const patient = slot.patient;

            // Slot Bloqueado
            if (slot.isBlocked) {
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-100/70 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 text-stone-500"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-stone-600 dark:text-stone-400 w-14">
                      {slot.time} hs
                    </span>
                    <Lock className="w-4 h-4 text-stone-400" />
                    <span className="text-xs font-semibold">{slot.blockReason || 'Horario bloqueado'}</span>
                  </div>
                </div>
              );
            }

            // Slot Disponible (Espacio Libre)
            if (slot.isAvailable) {
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300 w-14">
                      {slot.time} hs
                    </span>
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Horario libre disponible
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setBlockSlotInitialData({ date: todayOverview.dateString, time: slot.time });
                        setIsBlockSlotModalOpen(true);
                      }}
                      className="text-[11px] font-semibold text-stone-500 hover:text-stone-800 px-2 py-1 rounded-lg"
                    >
                      Bloquear
                    </button>
                    <button
                      onClick={() => {
                        setNewAppointmentInitialSlot({ date: todayOverview.dateString, time: slot.time });
                        setIsNewAppointmentModalOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl shadow-2xs flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agendar Turno</span>
                    </button>
                  </div>
                </div>
              );
            }

            // Slot con Turno Agendado
            if (app && patient) {
              return (
                <div
                  key={app.id}
                  className="p-4 rounded-2xl bg-white dark:bg-[#15221C] border border-stone-200/80 dark:border-stone-800 shadow-2xs hover:border-teal-300 dark:hover:border-teal-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 px-2 py-1 rounded-lg">
                        {slot.time} hs
                      </span>
                      <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {patient.firstName} {patient.lastName}
                      </span>
                      <StatusBadge status={app.status} />
                      {app.arrivedAt && !app.completedAt && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                          En sala
                        </span>
                      )}
                      {/* Patient Delay Notice Badge (Prompt 22) */}
                      {app.administrativeNotes && app.administrativeNotes.includes('Avisó demora') && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300">
                          +10 min demora
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 flex flex-wrap items-center gap-3">
                      <span>Tel: {patient.whatsappPhone || patient.phone}</span>
                      {patient.insurance && <span>· Obra social: {patient.insurance}</span>}
                      {app.seriesIndex && app.seriesTotal && (
                        <span className="font-semibold text-teal-700 dark:text-teal-300">
                          · Serie: {app.seriesIndex} de {app.seriesTotal}
                        </span>
                      )}
                      {app.administrativeNotes && (
                        <span className="italic text-stone-400">· "{app.administrativeNotes}"</span>
                      )}
                    </div>
                  </div>

                  {/* Acciones Rápidas del Turno */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {!app.arrivedAt && app.status === AppointmentStatus.CONFIRMED && (
                      <button
                        onClick={() => markPatientArrived(app.id)}
                        className="px-2.5 py-1 text-xs font-semibold bg-amber-50 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100"
                        title="Registrar llegada en recepción"
                      >
                        Llegó
                      </button>
                    )}

                    {app.status === AppointmentStatus.CONFIRMED && (
                      <button
                        onClick={() => updateAppointmentStatus(app.id, AppointmentStatus.COMPLETED)}
                        className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100"
                      >
                        Atendido
                      </button>
                    )}

                    <button
                      onClick={() => setDelayModalApp(app)}
                      className="px-2 py-1 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg"
                    >
                      Avisar demora
                    </button>

                    <button
                      onClick={() => setRescheduleModalApp(app)}
                      className="px-2 py-1 text-xs font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950 rounded-lg"
                    >
                      Reprogramar
                    </button>

                    <button
                      onClick={() => setCancelModalApp({ id: app.id, name: `${patient.firstName} ${patient.lastName}`, time: `${slot.time} hs` })}
                      className="px-2 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-lg"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>

      {/* Modales Contextuales */}
      {proposeModalReq && (
        <ProposeAlternativeModal
          request={proposeModalReq}
          onClose={() => setProposeModalReq(null)}
        />
      )}

      {cancelModalApp && (
        <CancelConfirmModal
          appointmentId={cancelModalApp.id}
          patientName={cancelModalApp.name}
          timeHs={cancelModalApp.time}
          onConfirm={async (reason) => {
            await cancelAppointment(cancelModalApp.id, reason);
            setCancelModalApp(null);
          }}
          onClose={() => setCancelModalApp(null)}
        />
      )}

      {delayModalApp && (
        <AvisarDemoraModal
          isOpen={!!delayModalApp}
          appointment={delayModalApp}
          onClose={() => setDelayModalApp(null)}
        />
      )}

      {isClinicDelayModalOpen && (
        <ClinicDelayBroadcastModal
          isOpen={isClinicDelayModalOpen}
          onClose={() => setIsClinicDelayModalOpen(false)}
        />
      )}

      {isClosingSummaryOpen && (
        <DailyClosingSummaryModal
          isOpen={isClosingSummaryOpen}
          onClose={() => setIsClosingSummaryOpen(false)}
        />
      )}

      {rescheduleModalApp && (
        <FastRescheduleModal
          isOpen={!!rescheduleModalApp}
          appointment={rescheduleModalApp}
          onClose={() => setRescheduleModalApp(null)}
        />
      )}

      {preparedModalData.isOpen && (
        <PreparedWhatsAppModal
          patientPhone={preparedModalData.phone}
          patientName={preparedModalData.patientName}
          onClose={() => setPreparedModalData((prev) => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
};
