import React, { useState } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { DecisionItem, DecisionSeverity, DecisionStatus } from '../../types/index.ts';
import { formatHumanDate, formatTimeHs } from '../../utils/dateUtils.ts';
import {
  Inbox,
  AlertTriangle,
  Info,
  CheckCircle2,
  Clock,
  ArrowRight,
  MessageCircle,
  X,
  Sparkles,
  Check,
  Calendar,
  User,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const DecisionCenterScreen: React.FC = () => {
  const {
    decisions,
    pendingDecisionsCount,
    resolveDecision,
    dismissDecision,
    setIsWhatsAppDrawerOpen,
    setActiveWhatsAppPatientId,
    showToast,
  } = useKineStore();

  const [filterSeverity, setFilterSeverity] = useState<'ALL' | DecisionSeverity>('ALL');
  const [filterStatus, setFilterStatus] = useState<'PENDING' | 'RESOLVED' | 'ALL'>('PENDING');
  const [expandedDecisionId, setExpandedDecisionId] = useState<string | null>(null);

  const filteredDecisions = decisions.filter((d) => {
    if (filterStatus === 'PENDING' && d.status !== 'PENDING') return false;
    if (filterStatus === 'RESOLVED' && d.status === 'PENDING') return false;
    if (filterSeverity !== 'ALL' && d.severity !== filterSeverity) return false;
    return true;
  });

  const handleAcceptProposal = async (decision: DecisionItem) => {
    const actionType = decision.proposedAction?.type || 'APPROVE_AUTOMATION';
    const payload = decision.proposedAction?.payload || decision.recommendedActions?.[0]?.payload;
    await resolveDecision(
      decision.id,
      actionType,
      payload as Record<string, unknown> | undefined,
      'Aprobado desde Bandeja de Decisiones'
    );
  };

  const handleAcceptAlternative = async (
    decision: DecisionItem,
    alt: { id: string; label: string; payload?: Record<string, unknown> }
  ) => {
    await resolveDecision(
      decision.id,
      'RESCHEDULE',
      alt.payload,
      `Aprobada alternativa: ${alt.label}`
    );
  };

  const handleOpenChat = (decision: DecisionItem) => {
    if (decision.patientId) {
      setActiveWhatsAppPatientId(decision.patientId);
    }
    setIsWhatsAppDrawerOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#121A17] p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
            <Inbox className="w-3.5 h-3.5" />
            <span>KineOS · Bandeja Única de Decisiones</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
            Centro de Decisiones
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-2xl">
            El kinesiólogo no debe revisar múltiples pantallas. Aquí se concentran exclusivamente los casos excepcionales o fuera de regla que requieren criterio profesional humano.
          </p>
        </div>

        {/* Counter Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-stone-50 dark:bg-[#18221E] px-4 py-3 rounded-2xl border border-stone-200 dark:border-stone-800 flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${pendingDecisionsCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
            <div>
              <div className="text-xs text-stone-400 font-medium">Pendientes de acción</div>
              <div className="text-xl font-bold text-stone-800 dark:text-stone-100">
                {pendingDecisionsCount}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white/60 dark:bg-[#121A17]/60 backdrop-blur-xs p-3 rounded-2xl border border-stone-200/70 dark:border-stone-800/70">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterStatus('PENDING')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === 'PENDING'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
            }`}
          >
            Pendientes ({decisions.filter((d) => d.status === 'PENDING').length})
          </button>
          <button
            onClick={() => setFilterStatus('RESOLVED')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === 'RESOLVED'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
            }`}
          >
            Historial Resueltas ({decisions.filter((d) => d.status !== 'PENDING').length})
          </button>
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filterStatus === 'ALL'
                ? 'bg-teal-700 text-white shadow-2xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/60'
            }`}
          >
            Todas ({decisions.length})
          </button>
        </div>

        <div className="flex items-center gap-1 text-xs">
          <span className="text-stone-400 mr-1">Severidad:</span>
          {(['ALL', 'urgent', 'warning', 'info'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                filterSeverity === sev
                  ? 'bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900'
                  : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {sev === 'ALL' ? 'Todas' : sev === 'urgent' ? 'Urgentes' : sev === 'warning' ? 'Advertencias' : 'Info'}
            </button>
          ))}
        </div>
      </div>

      {/* Decision Items List */}
      {filteredDecisions.length === 0 ? (
        <div className="bg-white dark:bg-[#121A17] rounded-3xl p-12 text-center border border-dashed border-stone-200 dark:border-stone-800 space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-stone-800 dark:text-stone-200">
            Bandeja al día · Cero decisiones pendientes
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 max-w-md mx-auto">
            El Automation Engine y la Secretaria Digital están resolviendo todos los casos operacionales según las políticas seguras del consultorio.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDecisions.map((dec) => {
            const isPending = dec.status === 'PENDING';
            const isExpanded = expandedDecisionId === dec.id;

            return (
              <div
                key={dec.id}
                className={`bg-white dark:bg-[#121A17] rounded-3xl border transition-all ${
                  isPending
                    ? dec.severity === 'urgent'
                      ? 'border-red-300 dark:border-red-900/60 shadow-sm'
                      : dec.severity === 'warning'
                      ? 'border-amber-300 dark:border-amber-900/60 shadow-xs'
                      : 'border-stone-200 dark:border-stone-800'
                    : 'border-stone-200/60 dark:border-stone-800/60 opacity-80'
                }`}
              >
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Item Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          dec.severity === 'urgent'
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300 border border-red-200/60'
                            : dec.severity === 'warning'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/60'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/60'
                        }`}
                      >
                        {dec.severity === 'urgent' ? (
                          <AlertTriangle className="w-5 h-5" />
                        ) : dec.severity === 'warning' ? (
                          <ShieldAlert className="w-5 h-5" />
                        ) : (
                          <Info className="w-5 h-5" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-2xs uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${
                              dec.severity === 'urgent'
                                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                                : dec.severity === 'warning'
                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            }`}
                          >
                            {dec.severity === 'urgent' ? 'Urgente' : dec.severity === 'warning' ? 'Requiere Atención' : 'Informativo'}
                          </span>

                          <span className="text-2xs text-stone-400 font-medium">
                            Fuente: {dec.source}
                          </span>

                          {!isPending && (
                            <span className="text-2xs font-semibold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                              {dec.status === 'ACCEPTED' ? '✓ Resuelta' : '✗ Descartada'}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-stone-900 dark:text-white">
                          {dec.title}
                        </h3>
                        {dec.patientName && (
                          <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 font-medium">
                            <User className="w-3.5 h-3.5 text-stone-400" />
                            <span>Paciente: <strong className="text-stone-700 dark:text-stone-200">{dec.patientName}</strong></span>
                            {dec.patientPhone && <span>· {dec.patientPhone}</span>}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-xs text-stone-400">
                      {new Date(dec.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                    </div>
                  </div>

                  {/* Context Narrative ("Qué ocurrió") */}
                  <div className="bg-stone-50 dark:bg-[#18221E] p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800/80 space-y-1.5">
                    <div className="text-2xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Contexto Operativo</span>
                    </div>
                    <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 leading-relaxed">
                      {dec.description}
                    </p>
                  </div>

                  {/* System Proposal ("Qué propone el sistema") */}
                  {isPending && (
                    <div className="bg-teal-50/70 dark:bg-teal-950/30 p-4 rounded-2xl border border-teal-200/70 dark:border-teal-800/50 space-y-2">
                      <div className="text-2xs font-bold uppercase tracking-wider text-teal-800 dark:text-teal-300 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Propuesta del Sistema</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-teal-950 dark:text-teal-100">
                            {dec.proposedAction?.label || dec.systemProposal || 'Propuesta automática disponible'}
                          </div>
                          <div className="text-xs text-teal-700/80 dark:text-teal-300/80 mt-0.5">
                            {dec.proposedAction?.details || dec.recommendedActions?.[0]?.description || 'Hacé clic para aplicar la propuesta con 1 clic.'}
                          </div>
                        </div>

                        {/* Primary Acceptance Button (1-Click) */}
                        <button
                          onClick={() => handleAcceptProposal(dec)}
                          className="px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs inline-flex items-center gap-2 shadow-xs transition-transform active:scale-95 shrink-0"
                        >
                          <Check className="w-4 h-4" />
                          <span>Aceptar Propuesta</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Actions & Alternatives Area */}
                  {isPending && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {dec.alternatives && dec.alternatives.length > 0 && (
                          <button
                            onClick={() => setExpandedDecisionId(isExpanded ? null : dec.id)}
                            className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 inline-flex items-center gap-1.5"
                          >
                            <span>Ver otras alternativas ({dec.alternatives.length})</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenChat(dec)}
                          className="px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 inline-flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Responder manualmente (WhatsApp)</span>
                        </button>
                      </div>

                      <button
                        onClick={() => dismissDecision(dec.id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800/60 inline-flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Descartar</span>
                      </button>
                    </div>
                  )}

                  {/* Expanded Alternatives Drawer */}
                  {isPending && isExpanded && dec.alternatives && dec.alternatives.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-stone-100 dark:border-stone-800/80 space-y-2">
                      <div className="text-2xs font-semibold uppercase tracking-wider text-stone-400">
                        Opciones Alternativas Evaluadas:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {dec.alternatives.map((alt) => (
                          <div
                            key={alt.id}
                            className="p-3 rounded-xl bg-stone-50 dark:bg-[#18221E] border border-stone-200/70 dark:border-stone-800/70 flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="text-xs font-bold text-stone-800 dark:text-stone-200">
                                {alt.label}
                              </div>
                              {alt.description && (
                                <div className="text-2xs text-stone-500 mt-0.5">
                                  {alt.description}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => handleAcceptAlternative(dec, alt)}
                              className="px-2.5 py-1.5 rounded-lg bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-2xs font-bold shrink-0 transition-colors"
                            >
                              Elegir
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Resolution Notes if Resolved */}
                  {!isPending && dec.resolutionNotes && (
                    <div className="text-xs text-stone-500 italic bg-stone-50 dark:bg-[#18221E] p-2.5 rounded-xl border border-stone-200/60 dark:border-stone-800/60">
                      Resolución: {dec.resolutionNotes} · {dec.resolvedBy || 'Profesional'}
                    </div>
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
