import React from 'react';
import { AppointmentStatus, RequestStatus } from '../../types/index.ts';
import { CheckCircle2, Clock, XCircle, AlertCircle, UserX, Check, Sparkles } from 'lucide-react';

interface Props {
  status: AppointmentStatus | RequestStatus | 'DISPONIBLE';
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  switch (status) {
    case AppointmentStatus.CONFIRMED:
    case RequestStatus.APPROVED:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 transition-colors">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Confirmado</span>
        </span>
      );

    case AppointmentStatus.PENDING_APPROVAL:
    case AppointmentStatus.REQUESTED:
    case RequestStatus.PENDING:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 transition-colors">
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Pendiente</span>
        </span>
      );

    case AppointmentStatus.COMPLETED:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-teal-900 border border-teal-200/80 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60 transition-colors">
          <Check className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Atendido</span>
        </span>
      );

    case AppointmentStatus.NO_SHOW:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60 transition-colors">
          <UserX className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>Ausente</span>
        </span>
      );

    case AppointmentStatus.CANCELLED:
    case RequestStatus.REJECTED:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60 transition-colors">
          <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          <span>Cancelado</span>
        </span>
      );

    case RequestStatus.PROPOSED_ALTERNATIVE:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60 transition-colors">
          <Clock className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
          <span>Propuesta Enviada</span>
        </span>
      );

    case 'DISPONIBLE':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-teal-800 bg-teal-50/80 border border-teal-200/60 dark:text-teal-300 dark:bg-teal-950/50 dark:border-teal-800/50 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
          <span>Disponible</span>
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
          <span>{String(status)}</span>
        </span>
      );
  }
};
