import React, { useState, useEffect, useRef } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { Search, X, User, Calendar, Clock, Phone, ArrowRight } from 'lucide-react';
import { formatHumanDate, formatTimeHs, parseDateFromIso, parseTimeFromIso } from '../../utils/dateUtils.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalSearchModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    patients,
    todayOverview,
    professionals,
    setActiveTab,
    setSelectedDate,
    setSelectedProfessionalId,
    setActiveWhatsAppPatientId,
    setIsWhatsAppDrawerOpen,
  } = useKineStore();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.trim().toLowerCase();

  // Búsqueda en pacientes
  const matchingPatients = q.length >= 2
    ? patients.filter((p) => {
        const full = `${p.firstName} ${p.lastName}`.toLowerCase();
        const ph = p.phone.toLowerCase();
        const wa = p.whatsappPhone.toLowerCase();
        const ins = (p.insurance || '').toLowerCase();
        return full.includes(q) || ph.includes(q) || wa.includes(q) || ins.includes(q);
      }).slice(0, 5)
    : [];

  // Búsqueda en turnos de hoy
  const matchingAppointments = q.length >= 2
    ? (todayOverview?.appointments || []).filter((app) => {
        const patName = app.patient ? `${app.patient.firstName} ${app.patient.lastName}`.toLowerCase() : '';
        const time = formatTimeHs(parseTimeFromIso(app.startAt));
        return patName.includes(q) || time.includes(q);
      }).slice(0, 4)
    : [];

  // Búsqueda en profesionales
  const matchingProfessionals = q.length >= 2
    ? professionals.filter((prof) => {
        const name = prof.displayName.toLowerCase();
        const spec = (prof.specialty || '').toLowerCase();
        return name.includes(q) || spec.includes(q);
      })
    : [];

  const hasResults =
    matchingPatients.length > 0 ||
    matchingAppointments.length > 0 ||
    matchingProfessionals.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-start justify-center pt-16 sm:pt-24 px-4 p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#121B17] w-full max-w-xl rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-[#15221C]">
          <Search className="w-5 h-5 text-stone-400 dark:text-stone-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por paciente, teléfono, turno u profesional..."
            className="w-full bg-transparent text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-hidden"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-stone-500 bg-stone-200/60 dark:bg-stone-800 dark:text-stone-400 rounded-md">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {q.length < 2 && (
            <div className="py-8 text-center text-xs text-stone-500 dark:text-stone-400">
              Escribí al menos 2 letras para buscar pacientes, turnos o teléfonos.
            </div>
          )}

          {q.length >= 2 && !hasResults && (
            <div className="py-8 text-center text-xs text-stone-500 dark:text-stone-400">
              No se encontraron coincidencias para "{query}".
            </div>
          )}

          {/* Pacientes encontrados */}
          {matchingPatients.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Pacientes</span>
              </div>
              <div className="space-y-1">
                {matchingPatients.map((pat) => (
                  <button
                    key={pat.id}
                    onClick={() => {
                      setActiveTab('pacientes');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors text-left group"
                  >
                    <div>
                      <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-teal-700 dark:group-hover:text-teal-300">
                        {pat.firstName} {pat.lastName}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-stone-400" />
                          {pat.whatsappPhone || pat.phone}
                        </span>
                        {pat.insurance && (
                          <span>· {pat.insurance}</span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-300 dark:text-stone-600 group-hover:text-teal-600 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Turnos encontrados */}
          {matchingAppointments.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                <span>Turnos de Hoy</span>
              </div>
              <div className="space-y-1">
                {matchingAppointments.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => {
                      setActiveTab('hoy');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors text-left group"
                  >
                    <div>
                      <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-teal-700 dark:group-hover:text-teal-300 flex items-center gap-2">
                        <span>{app.patient ? `${app.patient.firstName} ${app.patient.lastName}` : 'Turno'}</span>
                        <span className="text-xs px-2 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-mono">
                          {formatTimeHs(parseTimeFromIso(app.startAt))} hs
                        </span>
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        Estado: {app.status} {app.arrivedAt && '· En sala de espera'}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-300 dark:text-stone-600 group-hover:text-teal-600 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Profesionales encontrados */}
          {matchingProfessionals.length > 0 && (
            <div>
              <div className="text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider px-2 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>Profesionales</span>
              </div>
              <div className="space-y-1">
                {matchingProfessionals.map((prof) => (
                  <button
                    key={prof.id}
                    onClick={() => {
                      setSelectedProfessionalId(prof.id);
                      setActiveTab('agenda');
                      onClose();
                    }}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800/60 transition-colors text-left group"
                  >
                    <div>
                      <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 group-hover:text-teal-700 dark:group-hover:text-teal-300">
                        {prof.displayName}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {prof.specialty || 'Kinesiología general'}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-stone-300 dark:text-stone-600 group-hover:text-teal-600 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2.5 bg-stone-50 dark:bg-[#15221C] border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-400 dark:text-stone-500 flex items-center justify-between">
          <span>Navegá rápidamente por la gestión del consultorio</span>
          <button onClick={onClose} className="hover:text-stone-700 dark:hover:text-stone-300">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
