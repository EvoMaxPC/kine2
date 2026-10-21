import React, { useState, useEffect } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { X, Calendar, Clock, CheckCircle2, AlertTriangle, Repeat, ArrowRight, User } from 'lucide-react';
import { SeriesSlotPreview, SeriesFrequency } from '../../types/index.ts';
import { getTodayDateString, addDays } from '../../utils/dateUtils.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialPatientId?: string;
}

export const SeriesAppointmentModal: React.FC<Props> = ({ isOpen, onClose, initialPatientId }) => {
  const {
    patients,
    professionals,
    appointmentTypes,
    previewSeriesSlots,
    createSeriesAppointments,
  } = useKineStore();

  const [patientId, setPatientId] = useState<string>(initialPatientId || '');
  const [professionalId, setProfessionalId] = useState<string>('prof_demo_1');
  const [appointmentTypeId, setAppointmentTypeId] = useState<string>('apt_type_standard');
  const [startDate, setStartDate] = useState<string>(getTodayDateString());
  const [totalWeeks, setTotalWeeks] = useState<number>(4);
  const [selectedDays, setSelectedDays] = useState<number[]>([2, 4]); // Martes y Jueves
  const [timeSlots, setTimeSlots] = useState<{ [day: number]: string }>({ 2: '10:00', 4: '10:00' });
  const [durationMinutes, setDurationMinutes] = useState<number>(45);
  const [administrativeNotes, setAdministrativeNotes] = useState<string>('');

  // Preview state
  const [preview, setPreview] = useState<{
    totalSlots: number;
    availableCount: number;
    conflictCount: number;
    slots: SeriesSlotPreview[];
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (initialPatientId) {
      setPatientId(initialPatientId);
    } else if (patients.length > 0 && !patientId) {
      setPatientId(patients[0].id);
    }
  }, [initialPatientId, patients]);

  // Actualizar previsualización cuando cambian los parámetros
  const handleAnalyze = async () => {
    if (!patientId || selectedDays.length === 0) return;
    setLoadingPreview(true);
    try {
      const primaryTime = timeSlots[selectedDays[0]] || '10:00';
      const freq: SeriesFrequency = selectedDays.length === 1 ? 'WEEKLY' : selectedDays.length === 2 ? 'TWICE_WEEKLY' : 'CUSTOM_DAYS';
      const slots = await previewSeriesSlots(
        startDate,
        primaryTime,
        freq,
        totalWeeks,
        professionalId
      );
      const availableCount = slots.filter((s) => s.isAvailable).length;
      const conflictCount = slots.filter((s) => !s.isAvailable).length;
      setPreview({
        totalSlots: slots.length,
        availableCount,
        conflictCount,
        slots,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      handleAnalyze();
    }
  }, [isOpen, patientId, professionalId, startDate, totalWeeks, selectedDays, timeSlots, durationMinutes]);

  if (!isOpen) return null;

  const toggleDay = (day: number) => {
    setSelectedDays((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev; // Mantener al menos un día
        return prev.filter((d) => d !== day);
      } else {
        const next = [...prev, day].sort();
        if (!timeSlots[day]) {
          setTimeSlots((ts) => ({ ...ts, [day]: '10:00' }));
        }
        return next;
      }
    });
  };

  const handleTimeChange = (day: number, time: string) => {
    setTimeSlots((prev) => ({ ...prev, [day]: time }));
  };

  const handleConfirmCreation = async () => {
    if (!preview || preview.availableCount === 0) return;
    setSubmitting(true);
    try {
      const availableOnly = preview.slots.filter((s) => s.isAvailable);

      const freq: SeriesFrequency = selectedDays.length === 1 ? 'WEEKLY' : selectedDays.length === 2 ? 'TWICE_WEEKLY' : 'CUSTOM_DAYS';

      await createSeriesAppointments({
        patientId,
        professionalId,
        appointmentTypeId,
        frequency: freq,
        totalSessions: availableOnly.length,
        confirmedSlots: availableOnly,
        notes: administrativeNotes,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const dayOptions = [
    { num: 1, label: 'Lun' },
    { num: 2, label: 'Mar' },
    { num: 3, label: 'Mié' },
    { num: 4, label: 'Jue' },
    { num: 5, label: 'Vie' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#121B17] w-full max-w-2xl rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#15221C]">
          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold text-base">
            <Repeat className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Crear Serie de Turnos (Recurrente)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Paciente y Profesional */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Paciente:
              </label>
              <select
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} {p.insurance ? `(${p.insurance})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Profesional asignado:
              </label>
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
              >
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Días y Horarios */}
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#15221C] border border-stone-200/60 dark:border-stone-800 space-y-3">
            <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
              Días de repetición semanal y horarios:
            </div>
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((d) => {
                const isSelected = selectedDays.includes(d.num);
                return (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => toggleDay(d.num)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>

            {/* Configurar hora por cada día seleccionado */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {selectedDays.map((dNum) => {
                const label = dayOptions.find((o) => o.num === dNum)?.label;
                return (
                  <div key={dNum} className="flex items-center gap-1.5 bg-white dark:bg-stone-900 px-2 py-1.5 rounded-lg border border-stone-200/80 dark:border-stone-700">
                    <span className="text-xs font-semibold text-stone-500 w-8">{label}:</span>
                    <input
                      type="time"
                      value={timeSlots[dNum] || '10:00'}
                      onChange={(e) => handleTimeChange(dNum, e.target.value)}
                      className="text-xs font-mono bg-transparent text-stone-900 dark:text-stone-100 focus:outline-hidden"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Duración y Semanas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Fecha de inicio:
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Cantidad de semanas:
              </label>
              <input
                type="number"
                min="1"
                max="12"
                value={totalWeeks}
                onChange={(e) => setTotalWeeks(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Duración por turno:
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
              >
                <option value={30}>30 min (Control breve)</option>
                <option value={45}>45 min (Sesión estándar)</option>
                <option value={60}>60 min (Evaluación inicial)</option>
              </select>
            </div>
          </div>

          {/* Análisis de Disponibilidad en Vivo (Regla 12) */}
          <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-3.5 bg-stone-50/50 dark:bg-[#15221C]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-800 dark:text-stone-200">
                Análisis de Disponibilidad de la Serie:
              </span>
              {loadingPreview ? (
                <span className="text-xs text-stone-400 animate-pulse">Verificando agenda...</span>
              ) : preview ? (
                <div className="flex items-center gap-2 text-xs font-bold">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    {preview.availableCount} Disponibles
                  </span>
                  {preview.conflictCount > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {preview.conflictCount} con conflicto
                    </span>
                  )}
                </div>
              ) : null}
            </div>

            {/* Listado de slots */}
            {preview && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {preview.slots.map((s, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                      s.isAvailable
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200'
                        : 'bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{s.dayName} {s.date.slice(5)}</span>
                      <span>·</span>
                      <span className="font-mono">{s.time} hs</span>
                    </div>
                    <div>
                      {s.isAvailable ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Disponible
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5" /> Ocupado
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-stone-50/70 dark:bg-[#15221C] border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
          <div className="text-xs text-stone-500 dark:text-stone-400">
            {preview && preview.conflictCount > 0 ? (
              <span>Se crearán los <strong>{preview.availableCount}</strong> turnos libres sin sobreescribir los ocupados.</span>
            ) : (
              <span>Todos los turnos están libres para reservar.</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmCreation}
              disabled={!preview || preview.availableCount === 0 || submitting}
              className="px-4 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>{submitting ? 'Creando serie...' : `Crear los ${preview?.availableCount || 0} Disponibles`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
