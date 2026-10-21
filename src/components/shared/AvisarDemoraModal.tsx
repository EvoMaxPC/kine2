import React, { useState } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { X, Clock, MessageSquare, Send } from 'lucide-react';
import { Appointment } from '../../types/index.ts';

interface Props {
  isOpen: boolean;
  appointment: Appointment | null;
  onClose: () => void;
}

export const AvisarDemoraModal: React.FC<Props> = ({ isOpen, appointment, onClose }) => {
  const { sendDelayNotification, patients } = useKineStore();

  const [selectedMinutes, setSelectedMinutes] = useState<number>(10);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  if (!isOpen || !appointment) return null;

  const patient = patients.find((p) => p.id === appointment.patientId);
  const patientName = patient ? patient.firstName : 'Paciente';

  const minutesToApply = isCustom ? (parseInt(customMinutes, 10) || 10) : selectedMinutes;

  const previewMessage = `Hola ${patientName}. Estamos con aproximadamente ${minutesToApply} minutos de demora en el consultorio. Te avisamos para que puedas organizarte mejor. Disculpá la espera.`;

  const handleSend = async () => {
    setSubmitting(true);
    try {
      await sendDelayNotification(appointment.id, minutesToApply);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const presetOptions = [5, 10, 15, 20];

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#121B17] w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#15221C]">
          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold text-base">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <span>Avisar Demora en Consultorio</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <div>
            <div className="text-xs text-stone-500 dark:text-stone-400 font-medium">Paciente destinatario:</div>
            <div className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-0.5">
              {patientName} {patient?.lastName} ({patient?.whatsappPhone || 'Sin WhatsApp'})
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
              Tiempo estimado de demora:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {presetOptions.map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => {
                    setSelectedMinutes(min);
                    setIsCustom(false);
                  }}
                  className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                    !isCustom && selectedMinutes === min
                      ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                      : 'bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-amber-400'
                  }`}
                >
                  +{min} min
                </button>
              ))}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsCustom(true)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                  isCustom
                    ? 'bg-amber-100 dark:bg-amber-950/70 border-amber-400 text-amber-900 dark:text-amber-200'
                    : 'text-stone-500 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:text-stone-800'
                }`}
              >
                Personalizar minutos:
              </button>
              {isCustom && (
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  placeholder="Ej. 25"
                  className="w-20 px-2 py-1 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 focus:outline-hidden"
                  autoFocus
                />
              )}
            </div>
          </div>

          {/* Preview del mensaje de WhatsApp */}
          <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-[#15221C] border border-stone-200/80 dark:border-stone-800 text-xs text-stone-700 dark:text-stone-300 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500 flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-teal-600" />
              <span>Mensaje preparado para WhatsApp</span>
            </div>
            <p className="italic font-normal">"{previewMessage}"</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-stone-50/70 dark:bg-[#15221C] border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-800 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={submitting}
            className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Enviando...' : 'Preparar y Enviar WhatsApp'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
