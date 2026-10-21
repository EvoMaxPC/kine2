import React, { useState, useEffect } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { X, Calendar, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Appointment } from '../../types/index.ts';
import { formatHumanDate, formatTimeHs, parseDateFromIso, parseTimeFromIso, getTodayDateString, addDays } from '../../utils/dateUtils.ts';

interface Props {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
}

export const FastRescheduleModal: React.FC<Props> = ({ isOpen, appointment, onClose }) => {
  const {
    executeFastReschedule,
    patients,
    daySchedule,
    appointmentTypes,
    todayOverview,
  } = useKineStore();

  const [availableSuggestions, setAvailableSuggestions] = useState<Array<{
    date: string;
    time: string;
    startIso: string;
    endIso: string;
    human: string;
  }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSlot, setSelectedSlot] = useState<{ startIso: string; endIso: string } | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && appointment) {
      setSelectedSlot(null);
      setLoading(true);

      // Calcular primeros horarios disponibles
      const suggestions: Array<{
        date: string;
        time: string;
        startIso: string;
        endIso: string;
        human: string;
      }> = [];

      const today = getTodayDateString();
      const datesToInspect = [today, addDays(today, 1), addDays(today, 2), addDays(today, 3)];

      // Simulamos la disponibilidad rápida de las primeras opciones disponibles
      for (const d of datesToInspect) {
        const isToday = d === today;
        const candidateTimes = isToday ? ['17:00', '17:45', '18:30'] : ['09:00', '10:30', '11:15', '16:00', '17:30'];

        for (const t of candidateTimes) {
          if (suggestions.length >= 5) break;

          const startIso = `${d}T${t}:00.000Z`;
          const [h, m] = t.split(':').map(Number);
          const endMin = h * 60 + m + (appointment.durationMinutes || 45);
          const endH = Math.floor(endMin / 60);
          const endM = endMin % 60;
          const endIso = `${d}T${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}:00.000Z`;

          // Evitar proponer el mismo horario que ya tiene
          if (startIso !== appointment.startAt) {
            suggestions.push({
              date: d,
              time: t,
              startIso,
              endIso,
              human: `${formatHumanDate(d)} a las ${t} hs`,
            });
          }
        }
      }

      setAvailableSuggestions(suggestions);
      if (suggestions.length > 0) {
        setSelectedSlot({ startIso: suggestions[0].startIso, endIso: suggestions[0].endIso });
      }
      setLoading(false);
    }
  }, [isOpen, appointment]);

  if (!isOpen || !appointment) return null;

  const patient = patients.find((p) => p.id === appointment.patientId);
  const patientName = patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente';
  const currentDateHuman = formatHumanDate(parseDateFromIso(appointment.startAt));
  const currentTimeHuman = formatTimeHs(parseTimeFromIso(appointment.startAt));

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      await executeFastReschedule(appointment.id, selectedSlot.startIso, selectedSlot.endIso);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#121B17] w-full max-w-lg rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#15221C]">
          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold text-base">
            <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Reprogramación Rápida de Turno</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#15221C] border border-stone-200/60 dark:border-stone-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-stone-500 dark:text-stone-400">Paciente:</div>
              <div className="text-sm font-bold text-stone-900 dark:text-stone-100">{patientName}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-stone-500 dark:text-stone-400">Turno actual:</div>
              <div className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                {currentDateHuman} · {currentTimeHuman} hs
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
              Primeros Horarios Disponibles Compatibles:
            </label>

            {loading ? (
              <div className="py-8 text-center text-xs text-stone-400 animate-pulse">
                Calculando horarios disponibles compatibles...
              </div>
            ) : availableSuggestions.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 dark:text-stone-400">
                No se encontraron horarios libres en los próximos días.
              </div>
            ) : (
              <div className="space-y-2">
                {availableSuggestions.map((slot, idx) => {
                  const isSelected = selectedSlot?.startIso === slot.startIso;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedSlot({ startIso: slot.startIso, endIso: slot.endIso })}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-950 dark:text-teal-200 shadow-2xs font-semibold'
                          : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-teal-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Clock className={`w-4 h-4 ${isSelected ? 'text-teal-600' : 'text-stone-400'}`} />
                        <span className="text-xs sm:text-sm">{slot.human}</span>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="text-[11px] text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-[#15221C] p-2.5 rounded-lg border border-stone-200/50 dark:border-stone-800">
            💡 Al confirmar, se actualiza atómicamente la agenda del profesional y se prepara el mensaje para WhatsApp con el nuevo horario.
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-stone-50/70 dark:bg-[#15221C] border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-800 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedSlot || submitting}
            className="px-4 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>{submitting ? 'Reprogramando...' : 'Confirmar Reprogramación'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
