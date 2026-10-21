import React, { useState } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import {
  formatHumanDate,
  formatShortDate,
  formatTimeHs,
  parseTimeFromIso,
  getTodayDateString,
  addDays,
} from '../../utils/dateUtils.ts';
import { StatusBadge } from '../../design-system/components/StatusBadge.tsx';
import { Appointment, AppointmentStatus } from '../../types/index.ts';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  Filter,
  Check,
  UserX,
  MessageCircle,
  Lock,
  RotateCw,
} from 'lucide-react';
import { NewAppointmentModal } from '../appointments/NewAppointmentModal.tsx';
import { CancelConfirmModal } from '../shared/CancelConfirmModal.tsx';
import { FastRescheduleModal } from '../shared/FastRescheduleModal.tsx';
import { AvisarDemoraModal } from '../shared/AvisarDemoraModal.tsx';
import { WeeklyScheduleManager } from './WeeklyScheduleManager.tsx';

export const AgendaScreen: React.FC = () => {
  const {
    selectedDate,
    setSelectedDate,
    daySchedule,
    professionals,
    selectedProfessionalId,
    setSelectedProfessionalId,
    updateAppointmentStatus,
    cancelAppointment,
    setIsBlockSlotModalOpen,
    setBlockSlotInitialData,
    refreshAll,
    showToast,
  } = useKineStore();

  const [showWeeklyPlanner, setShowWeeklyPlanner] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [preselectedTime, setPreselectedTime] = useState<string | undefined>(undefined);
  const [filterMode, setFilterMode] = useState<'todos' | 'ocupados' | 'libres'>('todos');
  const [appointmentToCancel, setAppointmentToCancel] = useState<{
    id: string;
    patientName?: string;
    timeHs?: string;
  } | null>(null);
  const [rescheduleModalApp, setRescheduleModalApp] = useState<Appointment | null>(null);
  const [delayModalApp, setDelayModalApp] = useState<Appointment | null>(null);

  const today = getTodayDateString();
  const next7Days = Array.from({ length: 7 }, (_, i) => addDays(today, i));

  const occupiedCount = daySchedule.filter((s) => s.appointment).length;
  const freeCount = daySchedule.filter((s) => s.isAvailable).length;

  const filteredSlots = daySchedule.filter((slot) => {
    if (filterMode === 'ocupados') return !!slot.appointment;
    if (filterMode === 'libres') return slot.isAvailable;
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* Calendar Header Card */}
      <div className="bg-white dark:bg-[#121B17] border border-stone-200/80 dark:border-stone-800/80 rounded-3xl p-6 sm:p-7 shadow-[0_2px_12px_-4px_rgba(13,92,82,0.06)] space-y-5 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800/80">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 mb-1 flex items-center gap-2">
              <CalendarIcon className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>Agenda Profesional · Consultorio Kinesiológico</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white flex items-center gap-3">
              <span>{formatHumanDate(selectedDate)}</span>
              {selectedDate === today && (
                <span className="text-xs bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-bold px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800/60">
                  Hoy
                </span>
              )}
            </h1>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              {occupiedCount} turnos agendados · {freeCount} horarios libres disponibles
            </p>
          </div>

          {/* Navigation Controls & Professional Filter */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {/* Professional filter */}
            <div className="flex items-center gap-1.5 bg-stone-100 dark:bg-[#18231F] px-3 py-1.5 rounded-xl border border-stone-200/60 dark:border-stone-800 text-xs">
              <Filter className="w-3.5 h-3.5 text-stone-400" />
              <select
                value={selectedProfessionalId}
                onChange={(e) => setSelectedProfessionalId(e.target.value)}
                className="bg-transparent font-semibold text-stone-800 dark:text-stone-200 focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">Todos los profesionales</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-stone-100 dark:bg-[#18231F] p-1 rounded-xl">
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, -1))}
                className="p-1.5 hover:bg-stone-200 dark:hover:bg-[#202E29] text-stone-700 dark:text-stone-300 rounded-lg transition-colors"
                title="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDate(today)}
                className="px-2.5 py-1 text-xs font-bold text-stone-800 dark:text-stone-200 rounded-lg transition-colors hover:bg-stone-200 dark:hover:bg-[#202E29]"
              >
                Hoy
              </button>
              <button
                onClick={() => setSelectedDate(addDays(selectedDate, 1))}
                className="p-1.5 hover:bg-stone-200 dark:hover:bg-[#202E29] text-stone-700 dark:text-stone-300 rounded-lg transition-colors"
                title="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
              className="text-xs bg-stone-100 dark:bg-[#18231F] border border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300 px-3 py-2 rounded-xl focus:outline-hidden cursor-pointer"
            />

            <button
              onClick={() => setShowWeeklyPlanner((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                showWeeklyPlanner
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-stone-100 dark:bg-[#18231F] text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>{showWeeklyPlanner ? 'Ocultar Planificador' : 'Planificar Semanas'}</span>
            </button>
          </div>
        </div>

        {/* 7-Day Navigation Strip */}
        <div>
          <div className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">
            Vista rápida semanal
          </div>
          <div className="grid grid-cols-7 gap-2">
            {next7Days.map((d) => {
              const isSelected = d === selectedDate;
              const isDToday = d === today;
              const dateObj = new Date(`${d}T12:00:00`);
              const dayNum = dateObj.getDate();
              const dayName = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dateObj.getDay()];

              return (
                <button
                  key={d}
                  onClick={() => setSelectedDate(d)}
                  className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-2xl border transition-all ${
                    isSelected
                      ? 'bg-teal-700 border-teal-700 text-white shadow-xs font-bold'
                      : 'bg-stone-50/70 hover:bg-stone-100 dark:bg-[#15221C] dark:hover:bg-[#182620] border-stone-200/60 dark:border-stone-800/80 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <span className={`text-[11px] font-semibold ${isSelected ? 'text-teal-100' : 'text-stone-400'}`}>
                    {dayName}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold mt-0.5">{dayNum}</span>
                  {isDToday && (
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters and Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-1.5">
            {(['todos', 'ocupados', 'libres'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                  filterMode === mode
                    ? 'bg-stone-900 text-white dark:bg-teal-700'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setBlockSlotInitialData({ date: selectedDate, time: '13:00' });
                setIsBlockSlotModalOpen(true);
              }}
              className="px-3 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-stone-500" />
              <span>Bloquear Horario</span>
            </button>
            <button
              onClick={() => {
                setPreselectedTime(undefined);
                setIsNewModalOpen(true);
              }}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Turno</span>
            </button>
          </div>
        </div>
      </div>

      {/* Planificador Semanal (WeeklySchedule) */}
      {showWeeklyPlanner && (
        <WeeklyScheduleManager
          onScheduleUpdated={refreshAll}
          showToast={showToast}
        />
      )}

      {/* Schedule Slots Timeline */}
      <div className="space-y-3">
        {filteredSlots.length === 0 ? (
          <div className="bg-white dark:bg-[#121B17] border border-stone-200/80 dark:border-stone-800/80 rounded-3xl p-12 text-center">
            <Clock className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
              No hay turnos ni horarios para mostrar
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Probá cambiando el filtro o navegando a otra fecha hábil.
            </p>
          </div>
        ) : (
          filteredSlots.map((slot, index) => {
            const appointment = slot.appointment;
            const patient = slot.patient;

            // Blocked Slot
            if (slot.isBlocked) {
              return (
                <div
                  key={index}
                  className="bg-stone-100/70 dark:bg-stone-800/40 border border-stone-200/60 dark:border-stone-800 rounded-2xl p-4 flex items-center justify-between gap-4 text-stone-500"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-stone-600 dark:text-stone-400 w-16">
                      {slot.time} hs
                    </span>
                    <Lock className="w-4 h-4 text-stone-400" />
                    <span className="text-xs font-semibold">{slot.blockReason || 'Horario bloqueado'}</span>
                  </div>
                </div>
              );
            }

            // Free Available Slot
            if (slot.isAvailable) {
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-[#121B17] border border-dashed border-emerald-300 dark:border-emerald-800/60 rounded-2xl p-4 flex items-center justify-between gap-4 hover:border-emerald-500 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold text-emerald-800 dark:text-emerald-300 w-16">
                      {slot.time} hs
                    </span>
                    <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Espacio disponible
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setBlockSlotInitialData({ date: selectedDate, time: slot.time });
                        setIsBlockSlotModalOpen(true);
                      }}
                      className="px-2.5 py-1.5 text-xs text-stone-500 hover:text-stone-800 dark:text-stone-400 rounded-lg"
                    >
                      Bloquear
                    </button>
                    <button
                      onClick={() => {
                        setPreselectedTime(slot.time);
                        setIsNewModalOpen(true);
                      }}
                      className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-2xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agendar Turno</span>
                    </button>
                  </div>
                </div>
              );
            }

            // Occupied Slot with Appointment
            if (appointment && patient) {
              const isConfirmed = appointment.status === AppointmentStatus.CONFIRMED;

              return (
                <div
                  key={appointment.id}
                  className="bg-white dark:bg-[#15221C] border border-stone-200/80 dark:border-stone-800 rounded-2xl p-4.5 shadow-2xs hover:border-teal-300 dark:hover:border-teal-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-xs font-bold text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-lg">
                        {slot.time} hs
                      </span>
                      <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {patient.firstName} {patient.lastName}
                      </span>
                      <StatusBadge status={appointment.status} />
                      {appointment.seriesIndex && appointment.seriesTotal && (
                        <span className="text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                          (Serie {appointment.seriesIndex}/{appointment.seriesTotal})
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-stone-500 dark:text-stone-400 mt-1.5 flex flex-wrap items-center gap-3">
                      <span>Tel: {patient.whatsappPhone || patient.phone}</span>
                      {patient.insurance && <span>· Cobertura: {patient.insurance}</span>}
                      {appointment.administrativeNotes && (
                        <span className="text-stone-400 italic">· "{appointment.administrativeNotes}"</span>
                      )}
                    </div>
                  </div>

                  {/* Operational Quick Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    {isConfirmed && (
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, AppointmentStatus.COMPLETED)}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors border border-emerald-200 dark:border-emerald-800"
                        title="Marcar como atendido"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Atendido</span>
                      </button>
                    )}

                    {isConfirmed && (
                      <button
                        onClick={() => updateAppointmentStatus(appointment.id, AppointmentStatus.NO_SHOW)}
                        className="px-2.5 py-1.5 bg-stone-50 hover:bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Marcar paciente ausente"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Ausente</span>
                      </button>
                    )}

                    <button
                      onClick={() => setDelayModalApp(appointment)}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 text-xs font-semibold rounded-xl transition-colors border border-amber-200 dark:border-amber-800"
                    >
                      Avisar demora
                    </button>

                    <button
                      onClick={() => setRescheduleModalApp(appointment)}
                      className="px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200 text-xs font-semibold rounded-xl transition-colors border border-teal-200 dark:border-teal-800"
                    >
                      Reprogramar
                    </button>

                    <button
                      onClick={() =>
                        setAppointmentToCancel({
                          id: appointment.id,
                          patientName: `${patient.firstName} ${patient.lastName}`,
                          timeHs: `${slot.time} hs`,
                        })
                      }
                      className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              );
            }

            return null;
          })
        )}
      </div>

      {/* Modals */}
      {isNewModalOpen && (
        <NewAppointmentModal
          isOpen={isNewModalOpen}
          initialDate={selectedDate}
          initialTime={preselectedTime}
          initialProfessionalId={selectedProfessionalId === 'ALL' ? undefined : selectedProfessionalId}
          onClose={() => setIsNewModalOpen(false)}
        />
      )}

      {appointmentToCancel && (
        <CancelConfirmModal
          appointmentId={appointmentToCancel.id}
          patientName={appointmentToCancel.patientName}
          timeHs={appointmentToCancel.timeHs}
          onConfirm={async (reason) => {
            await cancelAppointment(appointmentToCancel.id, reason);
            setAppointmentToCancel(null);
          }}
          onClose={() => setAppointmentToCancel(null)}
        />
      )}

      {rescheduleModalApp && (
        <FastRescheduleModal
          isOpen={!!rescheduleModalApp}
          appointment={rescheduleModalApp}
          onClose={() => setRescheduleModalApp(null)}
        />
      )}

      {delayModalApp && (
        <AvisarDemoraModal
          isOpen={!!delayModalApp}
          appointment={delayModalApp}
          onClose={() => setDelayModalApp(null)}
        />
      )}
    </div>
  );
};
