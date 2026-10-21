import React, { useState } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import {
  Clock,
  User,
  Plus,
  Send,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { formatHumanDate, formatShortDate } from '../../utils/dateUtils.ts';

export const WaitlistScreen: React.FC = () => {
  const {
    waitlistEntries,
    patients,
    professionals,
    setIsWaitlistModalOpen,
    offerSlotToWaitlistPatient,
    showToast,
  } = useKineStore();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'OFFERED' | 'BOOKED'>('ALL');

  const filteredEntries = waitlistEntries.filter((e) => {
    if (activeFilter === 'ALL') return true;
    return e.status === activeFilter;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300">
            Urgente
          </span>
        );
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300">
            Alta
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
            Normal
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300">
            Activa
          </span>
        );
      case 'OFFERED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300">
            Turno Ofertado
          </span>
        );
      case 'BOOKED':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300">
            Turno Confirmado
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
            {status}
          </span>
        );
    }
  };

  const dayNames = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <span>Lista de Espera & Matching</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-bold">
              {waitlistEntries.filter((e) => e.status === 'ACTIVE').length} activas
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            Motor inteligente para reasignar turnos liberados y cancelar huecos vacíos en la agenda.
          </p>
        </div>

        <button
          onClick={() => setIsWaitlistModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar a Lista de Espera</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        {(['ALL', 'ACTIVE', 'OFFERED', 'BOOKED'] as const).map((tab) => {
          const labels = {
            ALL: 'Todas',
            ACTIVE: 'Activas',
            OFFERED: 'Ofertadas',
            BOOKED: 'Asignadas',
          };
          const isActive = activeFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                isActive
                  ? 'bg-stone-900 text-white dark:bg-teal-700 dark:text-white'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* List */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white dark:bg-[#121B17] rounded-2xl border border-stone-200 dark:border-stone-800 p-12 text-center">
          <Clock className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200">
            No hay pacientes en la lista de espera con este filtro
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
            Cuando un paciente necesite un turno no disponible, agregalo a la lista para recibir sugerencias automáticas apenas se cancele un turno.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => {
            const patient = patients.find((p) => p.id === entry.patientId);
            const prof = professionals.find((pr) => pr.id === entry.professionalId);
            const daysText = entry.preferredDays && entry.preferredDays.length > 0
              ? entry.preferredDays.map((d) => dayNames[d] || d).join(', ')
              : 'Cualquier día';

            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-[#121B17] rounded-2xl border border-stone-200 dark:border-stone-800 p-4 shadow-2xs hover:border-teal-300 dark:hover:border-teal-700 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-bold text-stone-900 dark:text-stone-100">
                        {patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente'}
                      </div>
                      <div className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-stone-400" />
                        <span>{patient?.whatsappPhone || patient?.phone}</span>
                        {patient?.insurance && <span>· {patient.insurance}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {getPriorityBadge(entry.priority)}
                      {getStatusBadge(entry.status)}
                    </div>
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs text-stone-600 dark:text-stone-300 bg-stone-50 dark:bg-[#15221C] p-3 rounded-xl border border-stone-200/60 dark:border-stone-800">
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 dark:text-stone-400">Días preferidos:</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">{daysText}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-stone-500 dark:text-stone-400">Profesional:</span>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">
                        {prof ? prof.displayName : 'Cualquiera disponible'}
                      </span>
                    </div>
                    {entry.notes && (
                      <div className="pt-1 text-[11px] text-stone-500 italic">
                        "{entry.notes}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                  <span className="text-[11px] text-stone-400">
                    Registrado {formatShortDate(entry.createdAt.slice(0, 10))}
                  </span>
                  {entry.status === 'ACTIVE' && (
                    <button
                      onClick={async () => {
                        const today = new Date().toISOString().slice(0, 10);
                        await offerSlotToWaitlistPatient(entry.id, `${today}T17:00:00.000Z`);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 rounded-lg text-xs font-semibold hover:bg-teal-100 transition-colors"
                    >
                      <Send className="w-3 h-3" />
                      <span>Ofrecer Turno Libre</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
