import React, { useState, useEffect } from 'react';
import {
  BellRing,
  CheckCircle,
  Calendar,
  Clock,
  User,
  Phone,
  DollarSign,
  AlertTriangle,
  MessageSquare,
  X,
  ArrowRight,
  ShieldCheck,
  Send,
  RefreshCw,
} from 'lucide-react';
import { AppointmentRequest } from '../../types/index.ts';
import { formatHumanDate, formatTimeHs } from '../../utils/dateUtils.ts';
import { playAlertSound } from '../../utils/soundUtils.ts';

interface KinesiologistAlertModalProps {
  isOpen: boolean;
  request: AppointmentRequest | null;
  consultationFee: number;
  clinicName: string;
  isSlotAvailable: boolean;
  onConfirm: (req: AppointmentRequest) => Promise<void>;
  onProposeAnother: (req: AppointmentRequest) => void;
  onReject: (req: AppointmentRequest) => void;
  onClose: () => void;
}

export const KinesiologistAlertModal: React.FC<KinesiologistAlertModalProps> = ({
  isOpen,
  request,
  consultationFee,
  clinicName,
  isSlotAvailable,
  onConfirm,
  onProposeAnother,
  onReject,
  onClose,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && request) {
      playAlertSound();
    }
  }, [isOpen, request?.id]);

  if (!isOpen || !request) return null;

  const targetDate = request.preferredDate || request.suggestedStartIso?.split('T')[0] || '';
  const targetTime = request.preferredTime || request.suggestedStartIso?.split('T')[1]?.slice(0, 5) || '';

  const handleConfirmClick = async () => {
    setIsProcessing(true);
    try {
      await onConfirm(request);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#121B17] w-full max-w-lg rounded-3xl border-2 border-amber-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Urgent Header Banner */}
        <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 text-white p-5 flex items-center justify-between relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center animate-bounce">
              <BellRing className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/20 text-[10px] font-extrabold uppercase tracking-wider text-amber-100">
                <span>Alerta Prioritaria · Decisión Requerida</span>
              </div>
              <h3 className="text-lg font-black tracking-tight text-white">
                Nueva Solicitud de Turno
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Availability Status Badge */}
          <div
            className={`p-3.5 rounded-2xl border flex items-center gap-2.5 font-bold ${
              isSlotAvailable
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}
          >
            {isSlotAvailable ? (
              <>
                <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Horario disponible en agenda semanal publicada · Sin superposiciones</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>Atención: El horario solicitado presenta conflicto o ya fue ocupado</span>
              </>
            )}
          </div>

          {/* Grid of Key Info */}
          <div className="grid grid-cols-2 gap-3">
            {/* Paciente */}
            <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 space-y-1">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-400" />
                <span>Paciente</span>
              </span>
              <p className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                {request.patientName || 'Paciente'}
              </p>
            </div>

            {/* Teléfono */}
            <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 space-y-1">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-stone-400" />
                <span>WhatsApp / Teléfono</span>
              </span>
              <p className="font-mono font-bold text-stone-900 dark:text-stone-100 text-xs">
                {request.patientPhone || 'Sin teléfono'}
              </p>
            </div>

            {/* Fecha / Hora Elegida */}
            <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 space-y-1">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                <span>Fecha y Hora Elegida</span>
              </span>
              <p className="font-bold text-indigo-600 dark:text-indigo-400">
                {targetDate ? formatHumanDate(targetDate) : 'Fecha a definir'} · {targetTime ? `${targetTime} hs` : ''}
              </p>
            </div>

            {/* Arancel */}
            <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 space-y-1">
              <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                <span>Arancel Informado</span>
              </span>
              <p className="font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                ${consultationFee.toLocaleString('es-AR')}
              </p>
            </div>
          </div>

          {/* Qué pidió */}
          <div className="p-3 bg-stone-50 dark:bg-stone-900/60 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 space-y-1">
            <span className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold">
              Qué pidió el paciente:
            </span>
            <p className="text-stone-800 dark:text-stone-200 font-medium">
              {request.administrativeNotes || 'Turno kinesiología individual coordinado por Secretaria Digital'}
            </p>
          </div>

          {/* Mensaje original de WhatsApp */}
          {request.originalMessage && (
            <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 rounded-2xl border border-amber-200/60 dark:border-amber-800/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" />
                <span>Mensaje original del paciente por WhatsApp:</span>
              </span>
              <p className="italic text-stone-700 dark:text-stone-300 font-mono text-xs">
                "{request.originalMessage}"
              </p>
            </div>
          )}

          {/* Guarantee notice */}
          <div className="flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <span>Al confirmar, se revalida la disponibilidad, se registra el turno en agenda y se envía WhatsApp al paciente.</span>
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-5 bg-stone-50 dark:bg-stone-900/80 border-t border-stone-200 dark:border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => onReject(request)}
              disabled={isProcessing}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all"
            >
              Rechazar
            </button>
            <button
              onClick={() => onProposeAnother(request)}
              disabled={isProcessing}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-bold transition-all"
            >
              Proponer Otro
            </button>
          </div>

          <button
            onClick={handleConfirmClick}
            disabled={isProcessing || !isSlotAvailable}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-white font-extrabold text-xs shadow-md transition-all flex items-center justify-center gap-2 ${
              isSlotAvailable
                ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-95'
                : 'bg-stone-400 dark:bg-stone-700 cursor-not-allowed'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Confirmando y despachando WhatsApp...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>CONFIRMAR TURNO</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
