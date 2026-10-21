import React, { useState } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { X, Clock, User, Calendar, Check } from 'lucide-react';
import { WaitlistPriority } from '../../types/index.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const WaitlistModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { patients, professionals, createWaitlistEntry } = useKineStore();

  const [patientId, setPatientId] = useState<string>(patients[0]?.id || '');
  const [professionalId, setProfessionalId] = useState<string>('');
  const [priority, setPriority] = useState<WaitlistPriority>('NORMAL');
  const [preferredDays, setPreferredDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timePreference, setTimePreference] = useState<'ANY' | 'MORNING' | 'AFTERNOON'>('ANY');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  const dayOptions = [
    { num: 1, label: 'Lun' },
    { num: 2, label: 'Mar' },
    { num: 3, label: 'Mié' },
    { num: 4, label: 'Jue' },
    { num: 5, label: 'Vie' },
  ];

  const toggleDay = (num: number) => {
    setPreferredDays((prev) =>
      prev.includes(num) ? prev.filter((d) => d !== num) : [...prev, num].sort()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) return;

    setSubmitting(true);
    try {
      let ranges: Array<{ start: string; end: string }> = [];
      if (timePreference === 'MORNING') {
        ranges = [{ start: '08:00', end: '13:00' }];
      } else if (timePreference === 'AFTERNOON') {
        ranges = [{ start: '15:00', end: '19:00' }];
      } else {
        ranges = [{ start: '08:00', end: '19:00' }];
      }

      await createWaitlistEntry({
        patientId,
        professionalId: professionalId || undefined,
        preferredDays,
        preferredTimeRanges: ranges,
        priority,
        notes: notes.trim() || undefined,
      });
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
            <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Agregar a Lista de Espera</span>
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
              Paciente:
            </label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
              required
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.whatsappPhone})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Profesional preferido:
              </label>
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
              >
                <option value="">Cualquiera disponible</option>
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                Prioridad:
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as WaitlistPriority)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Días de preferencia:
            </label>
            <div className="flex gap-2">
              {dayOptions.map((d) => (
                <button
                  key={d.num}
                  type="button"
                  onClick={() => toggleDay(d.num)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    preferredDays.includes(d.num)
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Franja horaria:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTimePreference('ANY')}
                className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                  timePreference === 'ANY'
                    ? 'bg-stone-800 dark:bg-teal-700 text-white border-transparent'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                }`}
              >
                Cualquiera
              </button>
              <button
                type="button"
                onClick={() => setTimePreference('MORNING')}
                className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                  timePreference === 'MORNING'
                    ? 'bg-stone-800 dark:bg-teal-700 text-white border-transparent'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                }`}
              >
                Mañana
              </button>
              <button
                type="button"
                onClick={() => setTimePreference('AFTERNOON')}
                className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                  timePreference === 'AFTERNOON'
                    ? 'bg-stone-800 dark:bg-teal-700 text-white border-transparent'
                    : 'bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                }`}
              >
                Tarde
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
              Notas administrativas:
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Avisar apenas se libere un turno por la tarde..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
            />
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
              className="px-4 py-2 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl transition-all shadow-xs disabled:opacity-50"
            >
              {submitting ? 'Guardando...' : 'Agregar a Lista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
