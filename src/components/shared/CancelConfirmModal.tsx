import React, { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';

interface Props {
  appointmentId: string;
  patientName?: string;
  timeHs?: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

export const CancelConfirmModal: React.FC<Props> = ({
  patientName,
  timeHs,
  onConfirm,
  onClose,
}) => {
  const [reason, setReason] = useState('Cancelación solicitada / Imprevisto del consultorio');

  const reasons = [
    'Cancelación solicitada por paciente',
    'Imprevisto del profesional',
    'Reprogramación acordada',
    'Inasistencia comunicada',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#141C19] border border-stone-200/90 dark:border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-stone-900 dark:text-white transition-colors duration-200">
        <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center border border-rose-200/60 dark:border-rose-900/50">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white">¿Cancelar este turno?</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {patientName ? `${patientName} · ` : ''}{timeHs ? `${timeHs} hs` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
            El turno pasará al estado <strong>Cancelado</strong>. El registro se conservará de forma inmutable en el historial del paciente y en auditoría, liberando el horario en la agenda.
          </p>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5">
              Motivo de cancelación:
            </label>
            <div className="space-y-1.5">
              {reasons.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                    reason === r
                      ? 'bg-stone-50 dark:bg-[#1A2520] border-teal-700/60 dark:border-teal-500 text-stone-900 dark:text-white font-semibold shadow-2xs'
                      : 'border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50/70 dark:hover:bg-[#16201B]'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-[#0D5C52]"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
            <span className="text-emerald-700 dark:text-emerald-400 text-base">💬</span>
            <span>Se preparará un mensaje cordial de aviso para el paciente por <strong>WhatsApp</strong>.</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100 dark:border-stone-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white rounded-xl transition-colors"
          >
            Volver
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            Confirmar Cancelación
          </button>
        </div>
      </div>
    </div>
  );
};
