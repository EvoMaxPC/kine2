import React, { useState, useEffect } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { X, Lock, Clock, Calendar, Check } from 'lucide-react';
import { getTodayDateString, buildIsoDateTime, computeEndIso } from '../../utils/dateUtils.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialData?: { date: string; time: string; professionalId?: string } | null;
}

export const BlockSlotModal: React.FC<Props> = ({ isOpen, onClose, initialData }) => {
  const { blockSlot, professionals } = useKineStore();

  const [date, setDate] = useState<string>(getTodayDateString());
  const [startTime, setStartTime] = useState<string>('13:00');
  const [durationOption, setDurationOption] = useState<'30' | '60' | 'CUSTOM' | 'FULL_DAY'>('60');
  const [customEndTime, setCustomEndTime] = useState<string>('14:00');
  const [reasonCategory, setReasonCategory] = useState<string>('Almuerzo / Receso');
  const [customReason, setCustomReason] = useState<string>('');
  const [professionalId, setProfessionalId] = useState<string>('prof_demo_1');
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      if (initialData.date) setDate(initialData.date);
      if (initialData.time) setStartTime(initialData.time);
      if (initialData.professionalId) setProfessionalId(initialData.professionalId);
    }
  }, [initialData]);

  if (!isOpen) return null;

  const quickReasons = ['Almuerzo / Receso', 'Trámite', 'Reunión', 'Personal', 'Capacitación', 'Otro'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let startIso = buildIsoDateTime(date, startTime);
      let endIso: string;

      if (durationOption === '30') {
        endIso = computeEndIso(startIso, 30);
      } else if (durationOption === '60') {
        endIso = computeEndIso(startIso, 60);
      } else if (durationOption === 'FULL_DAY') {
        startIso = buildIsoDateTime(date, '08:00');
        endIso = buildIsoDateTime(date, '19:00');
      } else {
        endIso = buildIsoDateTime(date, customEndTime);
      }

      const finalReason = reasonCategory === 'Otro' && customReason.trim()
        ? customReason.trim()
        : reasonCategory;

      await blockSlot(startIso, endIso, finalReason, professionalId);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#121B17] w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#15221C]">
          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold text-base">
            <Lock className="w-5 h-5 text-stone-700 dark:text-stone-300" />
            <span>Bloquear Horario en Agenda</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Profesional:
            </label>
            <select
              value={professionalId}
              onChange={(e) => setProfessionalId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
            >
              {professionals.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Fecha:
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
              />
            </div>
            {durationOption !== 'FULL_DAY' && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Hora de inicio:
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Duración del bloqueo:
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setDurationOption('30')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  durationOption === '30'
                    ? 'bg-stone-900 text-white dark:bg-teal-700 border-transparent shadow-xs'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                }`}
              >
                30 min
              </button>
              <button
                type="button"
                onClick={() => setDurationOption('60')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  durationOption === '60'
                    ? 'bg-stone-900 text-white dark:bg-teal-700 border-transparent shadow-xs'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                }`}
              >
                60 min
              </button>
              <button
                type="button"
                onClick={() => setDurationOption('CUSTOM')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  durationOption === 'CUSTOM'
                    ? 'bg-stone-900 text-white dark:bg-teal-700 border-transparent shadow-xs'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                }`}
              >
                Rango
              </button>
              <button
                type="button"
                onClick={() => setDurationOption('FULL_DAY')}
                className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                  durationOption === 'FULL_DAY'
                    ? 'bg-stone-900 text-white dark:bg-teal-700 border-transparent shadow-xs'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                }`}
              >
                Día entero
              </button>
            </div>
            {durationOption === 'CUSTOM' && (
              <div className="mt-2.5 flex items-center gap-2">
                <span className="text-xs text-stone-500">Hasta las:</span>
                <input
                  type="time"
                  value={customEndTime}
                  onChange={(e) => setCustomEndTime(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Motivo del bloqueo:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {quickReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReasonCategory(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    reasonCategory === r
                      ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 border-transparent'
                      : 'bg-stone-50 dark:bg-stone-800/60 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            {reasonCategory === 'Otro' && (
              <input
                type="text"
                placeholder="Especificar motivo administrativo..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="mt-2 w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                autoFocus
              />
            )}
          </div>

          {/* Footer */}
          <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold bg-stone-900 hover:bg-stone-800 dark:bg-teal-700 dark:hover:bg-teal-600 text-white rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Bloqueando...' : 'Aplicar Bloqueo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
