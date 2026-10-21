import React, { useState } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import {
  formatHumanDate,
  formatTimeHs,
  parseDateFromIso,
  parseTimeFromIso,
} from '../../utils/dateUtils.ts';
import { StatusBadge } from '../../design-system/components/StatusBadge.tsx';
import { AppointmentRequest, RequestStatus, RequestType } from '../../types/index.ts';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  ArrowRight,
  MessageCircle,
  AlertTriangle,
  History,
  Check,
  Phone,
  ShieldCheck,
} from 'lucide-react';
import { ProposeAlternativeModal } from './ProposeAlternativeModal.tsx';
import { PreparedWhatsAppModal } from '../shared/PreparedWhatsAppModal.tsx';

export const RequestsScreen: React.FC = () => {
  const { allRequests, patients, approveRequest, rejectRequest, setIsWhatsAppDrawerOpen } = useKineStore();
  const [selectedForProposal, setSelectedForProposal] = useState<AppointmentRequest | null>(null);
  const [selectedForWhatsAppPreview, setSelectedForWhatsAppPreview] = useState<{
    phone: string;
    patientName: string;
  } | null>(null);
  const [subTab, setSubTab] = useState<'pendientes' | 'historial'>('pendientes');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const pendingRequests = allRequests.filter((r) => r.status === RequestStatus.PENDING);
  const historyRequests = allRequests.filter((r) => r.status !== RequestStatus.PENDING);

  const patientMap = new Map(patients.map((p) => [p.id, p]));

  const handleApprove = async (req: AppointmentRequest) => {
    setProcessingId(req.id);
    const ok = await approveRequest(req.id);
    setProcessingId(null);

    if (ok) {
      const patient = patientMap.get(req.patientId);
      if (patient) {
        setSelectedForWhatsAppPreview({
          phone: patient.whatsappPhone,
          patientName: patient.firstName,
        });
      }
    }
  };

  const handleReject = async (req: AppointmentRequest) => {
    setProcessingId(req.id);
    await rejectRequest(req.id, 'Horario no disponible en agenda');
    setProcessingId(null);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-[#131B18] border border-stone-200/80 dark:border-stone-800/80 rounded-3xl p-6 sm:p-7 shadow-[0_2px_12px_-4px_rgba(13,92,82,0.06)] space-y-4 transition-colors duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-300 mb-1 flex items-center gap-2">
              <Inbox className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
              <span>Bandeja de Entrada · WhatsApp</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
              Solicitudes al Profesional ({pendingRequests.length})
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
              Peticiones de turnos y reprogramaciones recibidas por WhatsApp para tu control y validación determinística.
            </p>
          </div>

          {/* Sub-tab selector */}
          <div className="flex items-center gap-1 p-1 bg-stone-100 dark:bg-[#18231F] rounded-xl self-start sm:self-center border border-stone-200/40 dark:border-stone-800/60">
            <button
              onClick={() => setSubTab('pendientes')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                subTab === 'pendientes'
                  ? 'bg-white dark:bg-[#0D5C52] text-stone-900 dark:text-white shadow-2xs font-bold'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <span>Pendientes</span>
              {pendingRequests.length > 0 && (
                <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums">
                  {pendingRequests.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setSubTab('historial')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                subTab === 'historial'
                  ? 'bg-white dark:bg-[#0D5C52] text-stone-900 dark:text-white shadow-2xs font-bold'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historial ({historyRequests.length})</span>
            </button>
          </div>
        </div>

        {/* Informative Guarantee Banner */}
        <div className="p-3 bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/60 rounded-2xl flex items-center justify-between text-xs text-teal-950 dark:text-teal-200 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0" />
            <span>
              <strong>Principio de Seguridad:</strong> La IA interpreta el mensaje, pero solo tú y el motor determinístico confirman la reserva final.
            </span>
          </div>
          <button
            onClick={() => setIsWhatsAppDrawerOpen(true)}
            className="text-teal-900 dark:text-teal-300 hover:underline font-bold flex items-center gap-1"
          >
            <span>Abrir Simulador WhatsApp</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {subTab === 'pendientes' ? (
          pendingRequests.length === 0 ? (
            <div className="bg-white dark:bg-[#131B18] border border-stone-200/80 dark:border-stone-800/80 rounded-3xl p-12 text-center shadow-xs transition-colors duration-200">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center mx-auto mb-3 border border-teal-200/60 dark:border-teal-800/50">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-stone-900 dark:text-white">Bandeja al día</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto mt-1">
                No hay solicitudes pendientes que requieran tu visto bueno. Los nuevos mensajes de WhatsApp aparecerán aquí.
              </p>
            </div>
          ) : (
            pendingRequests.map((req) => {
              const patient = patientMap.get(req.patientId);
              const isProcessing = processingId === req.id;

              const reqDateHuman = req.requestedStartAt
                ? formatHumanDate(parseDateFromIso(req.requestedStartAt))
                : '';
              const reqTimeHuman = req.requestedStartAt
                ? formatTimeHs(parseTimeFromIso(req.requestedStartAt))
                : '';

              const isConflict = req.id === 'req_demo_2';

              return (
                <div
                  key={req.id}
                  className="bg-white dark:bg-[#131B18] border border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 rounded-3xl p-6 transition-all shadow-[0_2px_12px_-4px_rgba(13,92,82,0.06)]"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Patient & Request details */}
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 font-extrabold text-sm flex items-center justify-center shadow-2xs">
                          {patient?.firstName?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-stone-900 dark:text-white text-base">
                              {patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente'}
                            </span>
                            <span className="text-stone-300 dark:text-stone-700">·</span>
                            <span className="text-xs font-mono text-stone-500 dark:text-stone-400">
                              {patient?.whatsappPhone}
                            </span>
                            {patient?.insurance && (
                              <>
                                <span className="text-stone-300 dark:text-stone-700">·</span>
                                <span className="text-xs text-stone-600 dark:text-stone-400 font-medium">
                                  {patient.insurance}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="text-xs font-semibold text-teal-800 dark:text-teal-300 flex items-center gap-2 mt-0.5">
                            <span>
                              {req.type === RequestType.CHANGE
                                ? 'Solicitud de Cambio de Turno'
                                : req.type === RequestType.CREATE
                                ? 'Solicitud de Nuevo Turno'
                                : 'Solicitud de Cancelación'}
                            </span>
                            {isConflict ? (
                              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 px-2 py-0.2 rounded-md flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Conflicto: Ya ocupado en agenda</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.2 rounded-md flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>Horario disponible</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Turno actual vs Turno solicitado */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {req.type === RequestType.CHANGE && (
                          <div className="bg-stone-50 dark:bg-[#0E1513] border border-stone-200 dark:border-stone-800 rounded-2xl p-3.5">
                            <div className="text-[10px] font-bold text-stone-400 dark:text-stone-400 uppercase tracking-wider">
                              Turno Actual en Agenda
                            </div>
                            <div className="text-sm font-bold text-stone-800 dark:text-stone-200 mt-1">
                              Mañana · 16:00 hs
                            </div>
                          </div>
                        )}

                        <div className="bg-teal-50/70 dark:bg-teal-950/50 border border-teal-200/80 dark:border-teal-800/60 rounded-2xl p-3.5">
                          <div className="text-[10px] font-bold text-teal-900 dark:text-teal-300 uppercase tracking-wider">
                            {req.type === RequestType.CHANGE ? 'Solicita Cambiar a' : 'Horario Solicitado'}
                          </div>
                          <div className="text-sm font-extrabold text-teal-950 dark:text-teal-100 mt-1">
                            {reqDateHuman} · <span className="font-mono">{reqTimeHuman}</span>
                          </div>
                        </div>
                      </div>

                      {/* Patient Message */}
                      {req.patientMessage && (
                        <div className="text-xs text-stone-700 dark:text-stone-300 bg-stone-50/90 dark:bg-[#0E1513] px-4 py-3 rounded-2xl border border-stone-200/60 dark:border-stone-800 flex items-start gap-2">
                          <MessageCircle className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
                          <span className="italic leading-relaxed">"{req.patientMessage}"</span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons (1-Tap Approve, Alternative, Reject) */}
                    <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-2 shrink-0">
                      <button
                        disabled={isProcessing}
                        onClick={() => handleApprove(req)}
                        className="px-4 py-2.5 bg-[#0D5C52] hover:bg-[#0A473F] dark:bg-teal-700 dark:hover:bg-teal-600 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Check className="w-4 h-4" />
                        <span>{isProcessing ? 'Validando...' : 'Aceptar'}</span>
                      </button>

                      <button
                        disabled={isProcessing}
                        onClick={() => setSelectedForProposal(req)}
                        className="px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-[#1E2A25] dark:hover:bg-[#273832] text-stone-800 dark:text-stone-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <Calendar className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                        <span>Proponer otro horario</span>
                      </button>

                      <button
                        disabled={isProcessing}
                        onClick={() => handleReject(req)}
                        className="px-3 py-2.5 text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-rose-700 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Rechazar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Historial */
          <div className="bg-white dark:bg-[#131B18] border border-stone-200/80 dark:border-stone-800/80 rounded-3xl p-6 sm:p-7 shadow-xs transition-colors duration-200">
            <div className="divide-y divide-stone-100 dark:divide-stone-800/80">
              {historyRequests.length === 0 ? (
                <div className="py-8 text-center text-stone-400 dark:text-stone-400 text-xs">
                  No hay solicitudes resueltas en el historial.
                </div>
              ) : (
                historyRequests.map((req) => {
                  const patient = patientMap.get(req.patientId);
                  return (
                    <div key={req.id} className="py-3.5 flex items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 dark:text-white text-sm">
                            {patient ? `${patient.firstName} ${patient.lastName}` : 'Paciente'}
                          </span>
                          <span className="text-stone-300 dark:text-stone-700">·</span>
                          <span className="text-xs text-stone-500 dark:text-stone-400">
                            {req.type}
                          </span>
                        </div>
                        <div className="text-xs text-stone-400 dark:text-stone-400 mt-0.5">
                          {req.patientMessage}
                        </div>
                      </div>

                      <StatusBadge status={req.status} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Propose Alternative Modal */}
      {selectedForProposal && (
        <ProposeAlternativeModal
          request={selectedForProposal}
          onClose={() => setSelectedForProposal(null)}
        />
      )}

      {/* Prepared WhatsApp Preview Modal */}
      {selectedForWhatsAppPreview && (
        <PreparedWhatsAppModal
          patientPhone={selectedForWhatsAppPreview.phone}
          patientName={selectedForWhatsAppPreview.patientName}
          onClose={() => setSelectedForWhatsAppPreview(null)}
        />
      )}
    </div>
  );
};
