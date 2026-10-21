import React, { useState } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { X, Clock, Send, Users, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import { formatTimeHs, parseTimeFromIso } from '../../utils/dateUtils.ts';
import { AppointmentStatus, AutomationEventType } from '../../types/index.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ClinicDelayBroadcastModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const {
    todayOverview,
    sendDelayNotification,
    emitAutomationEvent,
    showToast,
  } = useKineStore();

  const [selectedMinutes, setSelectedMinutes] = useState<number>(15);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [completedBroadcast, setCompletedBroadcast] = useState<boolean>(false);

  if (!isOpen || !todayOverview) return null;

  // Identify upcoming affected appointments for today (CONFIRMED and not yet finished)
  const upcomingAppointments = todayOverview.appointments.filter(
    (a) => a.status === AppointmentStatus.CONFIRMED && !a.completedAt
  );

  const handleBroadcast = async () => {
    if (upcomingAppointments.length === 0) {
      showToast('No hay turnos próximos para notificar', 'info');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Emit CLINIC_DELAY_CHANGED automation event
      await emitAutomationEvent({
        id: `evt_delay_${Date.now()}`,
        type: AutomationEventType.CLINIC_DELAY_CHANGED,
        timestamp: new Date().toISOString(),
        source: 'PROFESSIONAL',
        payload: {
          professionalId: 'prof_demo_1',
          delayMinutes: selectedMinutes,
          affectedAppointmentIds: upcomingAppointments.map((a) => a.id),
        },
      });

      // 2. Dispatch personalized delay notification for each affected appointment
      for (const app of upcomingAppointments) {
        await sendDelayNotification(app.id, selectedMinutes);
      }

      setCompletedBroadcast(true);
      showToast(
        `Avisos de demora enviados individualmente a ${upcomingAppointments.length} paciente(s)`,
        'success'
      );
    } catch {
      showToast('Error al enviar avisos de demora', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#121B17] w-full max-w-xl rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-stone-100 dark:border-stone-800/80 bg-stone-50/50 dark:bg-[#15221C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Aviso Proactivo de Demora del Consultorio
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Notificación masiva controlada con mensajes personalizados de WhatsApp
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
          {completedBroadcast ? (
            <div className="py-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-stone-900 dark:text-stone-100">
                ¡Avisos enviados con éxito!
              </h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto">
                Se notificó a {upcomingAppointments.length} paciente(s) con el horario estimado ajustado y se registró en la auditoría.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-5 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs"
              >
                Volver a la Agenda
              </button>
            </div>
          ) : (
            <>
              {/* Delay Selector */}
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
                  Demora estimada en el consultorio:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[10, 15, 20, 30].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => setSelectedMinutes(min)}
                      className={`py-3 px-3 text-xs font-bold rounded-2xl border transition-all flex flex-col items-center gap-1 ${
                        selectedMinutes === min
                          ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-xs'
                          : 'bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-amber-400'
                      }`}
                    >
                      <span className="text-base font-black">+{min}</span>
                      <span className="text-[10px] uppercase font-semibold">minutos</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Affected Patients List Preview */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-stone-500" />
                    <span>{upcomingAppointments.length} Pacientes Próximos Afectados</span>
                  </span>
                  <span className="text-2xs text-stone-400">
                    Mensajes 100% individualizados
                  </span>
                </div>

                <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                  {upcomingAppointments.length === 0 ? (
                    <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/40 text-center text-xs text-stone-400">
                      No hay turnos próximos programados para hoy.
                    </div>
                  ) : (
                    upcomingAppointments.map((app) => {
                      const time = formatTimeHs(parseTimeFromIso(app.startAt));
                      const patient = app.patient;
                      const customMessage = `Hola ${patient?.firstName || 'Paciente'}, te escribimos desde el consultorio para avisarte que tenemos una demora estimada de ${selectedMinutes} min respecto a tu turno de las ${time} hs. Te esperamos a partir de las ${time} hs + ${selectedMinutes} min para tu mayor comodidad.`;

                      return (
                        <div
                          key={app.id}
                          className="p-3.5 rounded-2xl bg-stone-50 dark:bg-[#18221E] border border-stone-200/80 dark:border-stone-800 space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-stone-900 dark:text-stone-100">
                              {patient?.firstName} {patient?.lastName}
                            </span>
                            <span className="font-mono text-2xs font-semibold px-2 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                              Turno: {time} hs
                            </span>
                          </div>
                          <div className="text-stone-500 text-2xs italic line-clamp-2">
                            "{customMessage}"
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!completedBroadcast && (
          <div className="px-6 py-4 bg-stone-50/70 dark:bg-[#15221C] border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-800"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleBroadcast}
              disabled={submitting || upcomingAppointments.length === 0}
              className="px-5 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl transition-all shadow-xs flex items-center gap-2 disabled:opacity-50 active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? 'Enviando WhatsApps...' : `Avisar a Todos (${upcomingAppointments.length})`}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
