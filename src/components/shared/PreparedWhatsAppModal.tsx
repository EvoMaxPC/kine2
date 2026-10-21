import React, { useEffect, useState } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { ConversationMessage } from '../../types/index.ts';
import { X, MessageCircle, CheckCheck, Clock, ShieldCheck, Check } from 'lucide-react';

interface Props {
  patientPhone: string;
  patientName: string;
  onClose: () => void;
}

export const PreparedWhatsAppModal: React.FC<Props> = ({
  patientPhone,
  patientName,
  onClose,
}) => {
  const { patients, getPatientMessages, setIsWhatsAppDrawerOpen } = useKineStore();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  const patient = patients.find((p) => p.whatsappPhone === patientPhone);

  useEffect(() => {
    if (patient) {
      getPatientMessages(patient.id).then(setMessages);
    }
  }, [patient, getPatientMessages]);

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#141C19] border border-stone-200/90 dark:border-stone-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-stone-900 dark:text-white transition-colors duration-200">
        <div className="flex items-start justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center border border-emerald-200/60 dark:border-emerald-800/60 shadow-2xs">
              <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-stone-900 dark:text-white">
                Mensajes Preparados para WhatsApp
              </h2>
              <p className="text-xs font-mono text-stone-500 dark:text-stone-400">
                {patientName} · {patientPhone}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Guarantee Callout */}
        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Canal oficial WhatsApp:</strong> Las respuestas se preparan automáticamente con tono cálido, profesional y específico para kinesiología.
          </div>
        </div>

        {/* Messages Stream */}
        <div className="space-y-3 max-h-72 overflow-y-auto p-3.5 bg-stone-50/80 dark:bg-[#0E1513] rounded-2xl border border-stone-200/70 dark:border-stone-800">
          {messages.length === 0 ? (
            <p className="text-xs text-stone-400 dark:text-stone-500 text-center py-6">No hay mensajes registrados aún para este paciente.</p>
          ) : (
            messages.map((msg) => {
              const isOutbound = msg.direction === 'OUTBOUND';
              const time = new Date(msg.timestamp).toLocaleTimeString('es-AR', {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs shadow-2xs space-y-1 ${
                      isOutbound
                        ? 'bg-[#0D5C52] dark:bg-teal-800 text-white rounded-tr-none'
                        : 'bg-white dark:bg-[#1C2723] text-stone-800 dark:text-stone-100 rounded-tl-none border border-stone-200 dark:border-stone-700'
                    }`}
                  >
                    <div className="text-[10px] font-bold opacity-80 flex items-center justify-between gap-2">
                      <span>{isOutbound ? 'Consultorio Kinesiológico' : patientName}</span>
                      {isOutbound && (
                        <span className="text-[9px] bg-teal-800/80 dark:bg-teal-950/80 px-1.5 py-0.2 rounded font-semibold text-teal-100 dark:text-teal-200">
                          WhatsApp Outbound
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap leading-relaxed text-[12.5px]">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 text-[10px] opacity-75 pt-1 font-mono">
                      <span>{time}</span>
                      {isOutbound ? (
                        <CheckCheck className="w-3.5 h-3.5 text-teal-200" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-stone-400 dark:text-stone-300" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => {
              onClose();
              setIsWhatsAppDrawerOpen(true);
            }}
            className="text-xs font-semibold text-teal-800 dark:text-teal-300 hover:text-teal-950 dark:hover:text-teal-100 flex items-center gap-1.5"
          >
            <MessageCircle className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>Abrir en Simulador WhatsApp →</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-teal-700 dark:hover:bg-teal-600 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
