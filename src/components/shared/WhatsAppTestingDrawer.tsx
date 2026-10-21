import React, { useState, useEffect, useRef } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { ConversationMessage, Patient } from '../../types/index.ts';
import {
  X,
  Send,
  MessageCircle,
  Phone,
  CheckCheck,
  Sparkles,
  User,
  Mic,
  Smile,
  Clock,
  ArrowRight,
  ShieldCheck,
  Bot,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  UserPlus,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const WhatsAppTestingDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    patients,
    getPatientMessages,
    simulatePatientInboundMessage,
    todayOverview,
    activeWhatsAppPatientId,
  } = useKineStore();

  const [selectedIdentifier, setSelectedIdentifier] = useState<string>(activeWhatsAppPatientId || patients[0]?.id || 'pat_demo_1');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isAudioSim, setIsAudioSim] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isUnknownMode = selectedIdentifier === 'unknown_test';
  const selectedPatient = !isUnknownMode
    ? patients.find((p) => p.id === selectedIdentifier || p.phone === selectedIdentifier)
    : undefined;

  const fetchMessages = async () => {
    if (selectedPatient) {
      const msgs = await getPatientMessages(selectedPatient.id);
      setMessages(msgs);
    } else {
      setMessages([]);
    }
  };

  useEffect(() => {
    if (activeWhatsAppPatientId && activeWhatsAppPatientId !== selectedIdentifier) {
      setSelectedIdentifier(activeWhatsAppPatientId);
    }
  }, [activeWhatsAppPatientId]);

  useEffect(() => {
    if (isOpen) {
      fetchMessages();
    }
  }, [isOpen, selectedIdentifier, todayOverview]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string, asAudio = false) => {
    const text = (textToSend || inputText).trim();
    if (!text || isSending) return;

    setIsSending(true);
    setInputText('');

    const targetPhoneOrId = isUnknownMode
      ? '+5493519998877'
      : selectedPatient
      ? selectedPatient.id
      : selectedIdentifier;

    const res = await simulatePatientInboundMessage(
      targetPhoneOrId,
      text,
      asAudio,
      asAudio ? text : undefined
    );

    setLastResult(res);
    await fetchMessages();
    setIsSending(false);
  };

  const quickPresets = [
    {
      label: 'Pedir Turno',
      text: 'Hola, necesito agendar un turno para kinesiología esta semana por favor.',
    },
    {
      label: 'El miércoles 18 hs (Memoria)',
      text: 'El de las 18:00 hs me viene perfecto.',
    },
    {
      label: 'Cancelar Turno (Auto-heal)',
      text: 'Hola, lamentablemente no voy a poder ir a mi turno, necesito cancelarlo.',
    },
    {
      label: 'SÍ, tomo el turno (Waitlist)',
      text: 'SÍ, me sirve el turno que se liberó, lo tomo.',
    },
    {
      label: 'NO, cedo el turno',
      text: 'NO, en ese horario no llego, se lo cedo al siguiente.',
    },
    {
      label: '¿Dónde queda y precio? (FAQ)',
      text: 'Hola, ¿dónde queda el consultorio y cuánto sale la sesión?',
    },
    {
      label: 'Avisar Demora (+15m)',
      text: 'Buenas tardes, estoy atrapado en el tráfico y voy a llegar 15 minutos demorado.',
    },
    {
      label: 'Pedir Sobreturno (Decisión)',
      text: 'Hola, tuve un accidente cervical y tengo mucho dolor agudo. ¿Habrá posibilidad de un sobreturno hoy a última hora aunque no haya lugar?',
    },
    {
      label: 'Dar Nombre (Contacto Nuevo)',
      text: 'Hola soy Camila Morales, me derivó el traumatólogo para rehabilitación.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-stone-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#EFEAE2] dark:bg-[#0B141A] flex flex-col h-full shadow-2xl border-l border-stone-300 dark:border-stone-800 relative transition-colors duration-200">
        {/* WhatsApp Top Header Bar */}
        <div className="bg-[#075E54] dark:bg-[#1F2C34] text-white px-4 py-3 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onClose}
              className="p-1 -ml-1 text-emerald-100 dark:text-stone-300 hover:text-white rounded-lg transition-colors md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-700 dark:bg-[#005C4B] border border-emerald-500/50 dark:border-emerald-600/40 flex items-center justify-center font-bold text-sm text-white">
                {isUnknownMode ? '?' : selectedPatient?.firstName?.charAt(0) || 'P'}
              </div>
              <span className="w-3 h-3 bg-emerald-400 rounded-full absolute bottom-0 right-0 border-2 border-[#075E54] dark:border-[#1F2C34]"></span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm leading-tight truncate">
                {isUnknownMode
                  ? 'Contacto Nuevo (+54 9 351 999-8877)'
                  : selectedPatient
                  ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
                  : 'Paciente'}
              </h3>
              <p className="text-[11px] text-emerald-200 dark:text-stone-400 truncate font-mono">
                {isUnknownMode ? '+5493519998877' : selectedPatient?.whatsappPhone}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-emerald-100 dark:text-stone-300">
            <span className="text-[10px] bg-emerald-800/80 dark:bg-stone-800 px-2 py-0.5 rounded-full font-medium border border-emerald-600/40 dark:border-stone-700">
              KineOS Bot
            </span>
            <button
              onClick={onClose}
              className="p-1 hover:bg-emerald-800/60 dark:hover:bg-stone-800 rounded-lg transition-colors text-white"
              title="Cerrar simulador"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Patient Switcher */}
        <div className="bg-white/95 dark:bg-[#111B21] border-b border-stone-200 dark:border-stone-800 p-2.5 shrink-0 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Simular como:
            </span>
            <select
              value={selectedIdentifier}
              onChange={(e) => setSelectedIdentifier(e.target.value)}
              className="px-2.5 py-1 bg-stone-100 dark:bg-[#202C33] border border-stone-300 dark:border-stone-700 rounded-lg text-xs font-semibold text-stone-900 dark:text-white focus:outline-hidden"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName} ({p.insurance || p.whatsappPhone})
                </option>
              ))}
              <option value="unknown_test">
                ❓ Contacto Desconocido (Probar alta autónoma)
              </option>
            </select>
          </div>

          {/* Operational Memory Inspection Toggle */}
          <div className="pt-1 border-t border-stone-100 dark:border-stone-800/80">
            <button
              onClick={() => setIsMemoryOpen(!isMemoryOpen)}
              className="w-full flex items-center justify-between text-2xs font-bold text-teal-800 dark:text-teal-300 hover:opacity-80 py-0.5"
            >
              <span className="flex items-center gap-1.5">
                <BrainCircuit className="w-3.5 h-3.5 text-teal-600" />
                <span>Memoria Operativa (ConversationSession)</span>
              </span>
              {isMemoryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {isMemoryOpen && (
              <div className="mt-1.5 p-2.5 rounded-xl bg-stone-100 dark:bg-[#182229] border border-stone-200 dark:border-stone-700 text-2xs font-mono space-y-1">
                <div>
                  <strong>Paso actual:</strong> {lastResult?.session?.step || 'IDLE'}
                </div>
                <div>
                  <strong>Última intención:</strong> {lastResult?.intent || 'Ninguna'}
                </div>
                <div>
                  <strong>Slots ofrecidos en memoria:</strong>{' '}
                  {lastResult?.session?.candidateSlots?.length || 0}
                </div>
                {lastResult?.session?.candidateSlots?.length > 0 && (
                  <div className="pl-2 text-stone-600 dark:text-stone-400 space-y-0.5">
                    {lastResult.session.candidateSlots.map((s: any, idx: number) => (
                      <div key={idx}>• {s.humanLabel}</div>
                    ))}
                  </div>
                )}
                {lastResult?.session?.pendingOfferId && (
                  <div className="text-amber-600 dark:text-amber-400 font-bold">
                    • Oferta Waitlist pendiente: {lastResult.session.pendingOfferId}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Conversation Stream */}
        <div
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{
            backgroundImage: `radial-gradient(#CBD5E1 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        >
          {/* Encryption / Channel Notice */}
          <div className="flex justify-center my-1">
            <div className="bg-[#FFEECD] dark:bg-[#182229] text-[#54656F] dark:text-[#8696A0] text-[10px] px-3 py-1.5 rounded-lg shadow-2xs max-w-xs text-center border border-amber-200/60 dark:border-stone-700 flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" />
              <span>Secretaria Digital Autónoma · Respuestas determinísticas y reglas seguras.</span>
            </div>
          </div>

          {messages.length === 0 ? (
            <div className="text-center py-12 text-stone-500 dark:text-stone-400 text-xs">
              <p>No hay mensajes en esta conversación.</p>
              <p className="text-[11px] text-stone-400 dark:text-stone-500 mt-1">
                Elegí un preset abajo para probar los casos de Prompt Maestro 04.
              </p>
            </div>
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
                  className={`flex ${isOutbound ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs shadow-xs relative space-y-1 ${
                      isOutbound
                        ? 'bg-white dark:bg-[#202C33] text-stone-900 dark:text-stone-100 rounded-tl-xs border border-stone-200/80 dark:border-stone-700'
                        : 'bg-[#D9FDD3] dark:bg-[#005C4B] text-stone-900 dark:text-stone-100 rounded-tr-xs border border-emerald-200/60 dark:border-emerald-700/60'
                    }`}
                  >
                    <div className="text-[10px] font-bold text-stone-500 dark:text-stone-400 flex items-center justify-between gap-2">
                      <span>{isOutbound ? 'Secretaria KineTurnos' : selectedPatient?.firstName || 'Contacto'}</span>
                      {isOutbound && (
                        <span className="text-[9px] bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 px-1.5 py-0.2 rounded font-semibold border border-teal-200/50 dark:border-teal-800/50">
                          Autónoma
                        </span>
                      )}
                    </div>
                    {msg.messageType === 'AUDIO' && (
                      <div className="flex items-center gap-1.5 text-2xs text-stone-500 italic pb-1">
                        <Mic className="w-3 h-3 text-red-500" />
                        <span>Nota de voz (Transcrita):</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed text-[12.5px]">{msg.content}</p>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-stone-400 dark:text-stone-400 pt-0.5 font-mono">
                      <span>{time}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Presets Strip */}
        <div className="bg-[#F0F2F5] dark:bg-[#111B21] px-3 py-2 border-t border-stone-200 dark:border-stone-800 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-[10px] uppercase font-bold text-stone-400 dark:text-stone-500 shrink-0">
              Casos Rápidos:
            </span>
            {quickPresets.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(preset.text)}
                disabled={isSending}
                className="px-2.5 py-1 bg-white dark:bg-[#202C33] hover:bg-emerald-50 dark:hover:bg-[#2A3942] text-stone-700 dark:text-stone-200 hover:text-emerald-900 dark:hover:text-white text-[11px] font-medium rounded-full border border-stone-200 dark:border-stone-700 shrink-0 transition-colors shadow-2xs"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar with Audio Simulation */}
        <div className="bg-[#F0F2F5] dark:bg-[#202C33] p-3 border-t border-stone-200 dark:border-stone-800 shrink-0 flex items-center gap-2">
          <button
            onClick={() => handleSend(inputText || 'Hola, llamo para consultar por un turno de kinesiología', true)}
            disabled={isSending}
            className="p-2 rounded-full text-stone-500 hover:text-red-600 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            title="Simular envío de nota de audio (transcripción automática)"
          >
            <Mic className="w-4 h-4 text-stone-600 dark:text-stone-300 hover:text-red-500" />
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            placeholder="Escribe un mensaje de WhatsApp..."
            disabled={isSending}
            className="flex-1 px-3.5 py-2.5 bg-white dark:bg-[#2A3942] border border-stone-300 dark:border-stone-600 rounded-full text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-400 focus:outline-none focus:border-teal-700 dark:focus:border-teal-400"
          />

          <button
            onClick={() => handleSend()}
            disabled={!inputText.trim() || isSending}
            className="w-10 h-10 rounded-full bg-[#00A884] hover:bg-[#008f6f] dark:bg-[#00A884] dark:hover:bg-[#029071] disabled:opacity-50 text-white flex items-center justify-center transition-colors shadow-sm shrink-0 active:scale-95"
            title="Enviar mensaje"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
