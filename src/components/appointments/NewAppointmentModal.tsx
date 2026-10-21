import React, { useState, useEffect } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { buildIsoDateTime, computeEndIso, getTodayDateString } from '../../utils/dateUtils.ts';
import { X, AlertCircle, Calendar, Clock, User, FileText, Check } from 'lucide-react';
import { DEFAULT_RESOURCES } from '../../domain/resources/Resource.ts';

interface Props {
  isOpen?: boolean;
  initialDate?: string;
  initialTime?: string;
  initialProfessionalId?: string;
  preselectedPatientId?: string;
  onClose: () => void;
}

export const NewAppointmentModal: React.FC<Props> = ({
  initialDate,
  initialTime,
  initialProfessionalId,
  preselectedPatientId,
  onClose,
}) => {
  const {
    patients,
    professionals,
    appointmentTypes,
    createManualAppointment,
  } = useKineStore();

  const [patientId, setPatientId] = useState(preselectedPatientId || patients[0]?.id || '');
  const [professionalId, setProfessionalId] = useState(initialProfessionalId || 'prof_demo_1');
  const [appointmentTypeId, setAppointmentTypeId] = useState('apt_type_standard');
  const [resourceId, setResourceId] = useState('res_box_1');
  const [date, setDate] = useState(initialDate || getTodayDateString());
  const [time, setTime] = useState(initialTime || '09:00');
  const [duration, setDuration] = useState(45);
  const [administrativeNotes, setAdministrativeNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedPatientId) {
      setPatientId(preselectedPatientId);
    }
  }, [preselectedPatientId]);

  useEffect(() => {
    if (initialDate) setDate(initialDate);
    if (initialTime) setTime(initialTime);
    if (initialProfessionalId) setProfessionalId(initialProfessionalId);
  }, [initialDate, initialTime, initialProfessionalId]);

  // Sincronizar duración al cambiar tipo de sesión
  const handleTypeChange = (typeId: string) => {
    setAppointmentTypeId(typeId);
    const found = appointmentTypes.find((t) => t.id === typeId);
    if (found) {
      setDuration(found.durationMinutes);
    }
  };

  const selectedPatient = patients.find((p) => p.id === patientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId || !date || !time) return;

    setError(null);
    setIsSubmitting(true);

    const startIso = buildIsoDateTime(date, time);
    const endIso = computeEndIso(startIso, duration);

    const res = await createManualAppointment({
      patientId,
      professionalId,
      date,
      time,
      durationMinutes: duration,
      appointmentTypeId,
      resourceId,
      notes: administrativeNotes.trim() || undefined,
    });

    setIsSubmitting(false);

    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'No se pudo reservar el turno.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#121B17] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-4 shadow-2xl text-stone-900 dark:text-stone-100 transition-colors duration-200">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
              Agendar Turno
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Asignación con validación atómica de agenda
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Paciente */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Paciente *
            </label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-stone-100 focus:outline-hidden"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} — {p.insurance ? `${p.insurance} · ` : ''}{p.whatsappPhone}
                </option>
              ))}
            </select>
            {selectedPatient?.administrativeNotes && (
              <div className="text-[11px] text-stone-400 dark:text-stone-500 mt-1 italic">
                Nota recepción: {selectedPatient.administrativeNotes}
              </div>
            )}
          </div>

          {/* Profesional y Tipo de Sesión */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Profesional *
              </label>
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden"
              >
                {professionals.map((prof) => (
                  <option key={prof.id} value={prof.id}>
                    {prof.displayName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Tipo de Turno *
              </label>
              <select
                value={appointmentTypeId}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:outline-hidden"
              >
                {appointmentTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.durationMinutes} min)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha, Hora y Duración */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Fecha
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Hora Inicio
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
                Duración
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100"
              >
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
          </div>

          {/* Recurso / Box (Regla 8) */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Recurso / Sala (Opcional):
            </label>
            <select
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100"
            >
              {DEFAULT_RESOURCES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {/* Notas Administrativas */}
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 mb-1">
              Notas Administrativas de Recepción
            </label>
            <input
              type="text"
              value={administrativeNotes}
              onChange={(e) => setAdministrativeNotes(e.target.value)}
              placeholder="Ej. Abona en efectivo, requiere factura B, etc."
              className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100"
            />
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-100 dark:border-stone-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Verificando...' : 'Confirmar Turno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
