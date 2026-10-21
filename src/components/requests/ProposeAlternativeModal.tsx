import React, { useState } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { AppointmentRequest } from '../../types/index.ts';
import {
  formatHumanDate,
  formatTimeHs,
  getTodayDateString,
  addDays,
  buildIsoDateTime,
  computeEndIso,
} from '../../utils/dateUtils.ts';
import { X, Calendar, Clock, Sparkles } from 'lucide-react';

interface Props {
  request: AppointmentRequest;
  onClose: () => void;
}

export const ProposeAlternativeModal: React.FC<Props> = ({ request, onClose }) => {
  const { proposeAlternative, patients, config } = useKineStore();
  const [selectedDate, setSelectedDate] = useState(() => addDays(getTodayDateString(), 2));
  const [selectedTime, setSelectedTime] = useState('18:00');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const patient = patients.find((p) => p.id === request.patientId);
  const patientName = patient ? patient.firstName : 'Paciente';

  const today = getTodayDateString();
  const day2 = addDays(today, 2);
  const day3 = addDays(today, 3);

  // Quick 1-tap suggested available alternative slots
  const quickSuggestions = [
    { date: day2, time: '18:00', label: `${formatHumanDate(day2)} · 18:00 hs` },
    { date: day3, time: '10:00', label: `${formatHumanDate(day3)} · 10:00 hs` },
    { date: day3, time: '16:00', label: `${formatHumanDate(day3)} · 16:00 hs` },
  ];

  const availableHours = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const startIso = buildIsoDateTime(selectedDate, selectedTime);
    const endIso = computeEndIso(startIso, 60);

    const ok = await proposeAlternative(request.id, startIso, endIso);
    setIsSubmitting(false);

    if (ok) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#141C19] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl text-stone-900 dark:text-white transition-colors duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-base font-extrabold text-stone-900 dark:text-white">Proponer Horario Alternativo</h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">Para {patientName} · Notificación automática por WhatsApp</p>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1-Tap Quick Suggestions */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-900 dark:text-teal-300 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>Sugerencias rápidas de horarios libres:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {quickSuggestions.map((sug, idx) => {
              const isSelected = selectedDate === sug.date && selectedTime === sug.time;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedDate(sug.date);
                    setSelectedTime(sug.time);
                  }}
                  className={`p-2 rounded-xl text-left border transition-all text-xs ${
                    isSelected
                      ? 'bg-teal-50 dark:bg-teal-950/70 border-teal-700 dark:border-teal-500 text-teal-950 dark:text-teal-200 font-bold shadow-2xs'
                      : 'bg-stone-50 dark:bg-[#18231F] border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#202E29]'
                  }`}
                >
                  <div className="text-[10px] text-stone-500 dark:text-stone-400 font-normal truncate">
                    {formatHumanDate(sug.date).split(' ')[0]} {sug.date.split('-')[2]}
                  </div>
                  <div className="font-mono font-bold mt-0.5">{sug.time} hs</div>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Fecha propuesta
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0E1513] border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-white focus:outline-none focus:border-teal-700 dark:focus:border-teal-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Horario exacto
              </label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-[#0E1513] border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-white focus:outline-none focus:border-teal-700 dark:focus:border-teal-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1.5">
              Horas disponibles en consultorio:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {availableHours.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setSelectedTime(h)}
                  className={`py-2 px-2 text-xs font-mono font-medium rounded-xl border transition-all text-center ${
                    selectedTime === h
                      ? 'bg-[#0D5C52] dark:bg-teal-700 text-white border-transparent font-bold shadow-xs'
                      : 'bg-stone-50 dark:bg-[#18231F] border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#202E29]'
                  }`}
                >
                  {h} hs
                </button>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-teal-50/70 dark:bg-teal-950/40 rounded-2xl border border-teal-200/70 dark:border-teal-800/60 text-xs text-teal-950 dark:text-teal-200 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <span>💬 Mensaje preparado para WhatsApp:</span>
            </div>
            <p className="italic text-teal-900/90 dark:text-teal-300/90 leading-relaxed">
              "Hola {patientName}, para ese día {config.professionalDisplayName || 'el Profesional'} te propone el horario del{' '}
              {formatHumanDate(selectedDate)} a las {formatTimeHs(selectedTime)}. ¿Te queda bien ese turno?"
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-white rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-[#0D5C52] hover:bg-[#0A473F] dark:bg-teal-700 dark:hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-xs"
            >
              {isSubmitting ? 'Preparando...' : 'Enviar Propuesta por WhatsApp'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
