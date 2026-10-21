import React from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { DailyClosingSummaryService } from '../../services/DailyClosingSummaryService.ts';
import { formatHumanDate } from '../../utils/dateUtils.ts';
import {
  X,
  CheckCircle2,
  XCircle,
  RotateCw,
  TrendingUp,
  Inbox,
  UserCheck,
  DollarSign,
  CalendarCheck2,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const DailyClosingSummaryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { todayOverview, allRequests, config } = useKineStore();

  if (!isOpen || !todayOverview) return null;

  const closing = DailyClosingSummaryService.generateClosingSummary(
    todayOverview.dateString,
    todayOverview.appointments,
    allRequests,
    1, // 1 recovered turn from waitlist
    14000
  );

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#121B17] w-full max-w-lg rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#15221C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 flex items-center justify-center border border-teal-200/60 dark:border-teal-800/60">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Resumen de Cierre del Día
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {formatHumanDate(todayOverview.dateString)} · Balance operativo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Main Occupancy Banner */}
          <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/20 p-4 rounded-2xl border border-teal-200/60 dark:border-teal-800/40 flex items-center justify-between">
            <div>
              <div className="text-2xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300">
                Efectividad de Asistencia
              </div>
              <div className="text-2xl font-black text-teal-950 dark:text-teal-100 mt-0.5">
                {closing.occupancyPercentage}% de Ocupación
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xs text-stone-500">Pacientes Atendidos</div>
              <div className="text-xl font-bold text-stone-900 dark:text-white">
                {closing.attendedCount} / {todayOverview.totalAppointmentsCount}
              </div>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-[#18221E] border border-stone-200/70 dark:border-stone-800">
              <div className="flex items-center gap-1.5 text-2xs font-semibold text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Atendidos</span>
              </div>
              <div className="text-xl font-extrabold text-stone-900 dark:text-white mt-1">
                {closing.attendedCount}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-[#18221E] border border-stone-200/70 dark:border-stone-800">
              <div className="flex items-center gap-1.5 text-2xs font-semibold text-rose-600 dark:text-rose-400">
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancelados</span>
              </div>
              <div className="text-xl font-extrabold text-stone-900 dark:text-white mt-1">
                {closing.cancelledCount}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-[#18221E] border border-stone-200/70 dark:border-stone-800">
              <div className="flex items-center gap-1.5 text-2xs font-semibold text-amber-600 dark:text-amber-400">
                <RotateCw className="w-3.5 h-3.5" />
                <span>Reprogramados</span>
              </div>
              <div className="text-xl font-extrabold text-stone-900 dark:text-white mt-1">
                {closing.rescheduledCount}
              </div>
            </div>
          </div>

          {/* Economic Value Recovered through Waitlist */}
          <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Turnos Recuperados por Lista de Espera</span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-900 dark:text-amber-300">
                +{closing.recoveredSlotsCount} turno
              </span>
            </div>
            <p className="text-2xs text-stone-600 dark:text-stone-300">
              El motor autónomo reasignó inmediatamente el hueco liberado, recuperando un valor económico estimado de <strong>${closing.estimatedEconomicValueRecovered.toLocaleString('es-AR')}</strong> para el consultorio.
            </p>
          </div>

          {/* Pending Requests for Tomorrow */}
          <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-[#18221E] border border-stone-200/70 dark:border-stone-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-stone-700 dark:text-stone-300 font-semibold">
              <Inbox className="w-4 h-4 text-stone-500" />
              <span>Solicitudes pendientes para mañana:</span>
            </div>
            <span className="font-bold text-stone-900 dark:text-white">
              {closing.pendingRequestsForTomorrow}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-stone-50/70 dark:bg-[#15221C] border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-xl shadow-xs transition-colors"
          >
            Cerrar Resumen
          </button>
        </div>
      </div>
    </div>
  );
};
