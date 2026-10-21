import React, { useState } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { AutomationLevel, AutomationRule, AutomationEventType } from '../../types/index.ts';
import {
  Cpu,
  Zap,
  Sliders,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ShieldCheck,
  Activity,
  ArrowRight,
  Terminal,
} from 'lucide-react';

export const AutomationScreen: React.FC = () => {
  const {
    automationRules,
    automationLogs,
    updateRuleLevel,
    toggleRuleEnabled,
    resetRulesToDefault,
    emitAutomationEvent,
    showToast,
  } = useKineStore();

  const [activeTab, setActiveTab] = useState<'rules' | 'logs'>('rules');
  const [isSimulating, setIsSimulating] = useState(false);

  // Statistics
  const activeCount = automationRules.filter((r) => r.enabled).length;
  const autoCount = automationRules.filter((r) => r.enabled && r.level === 'AUTO').length;
  const askCount = automationRules.filter((r) => r.enabled && r.level === 'ASK_PROFESSIONAL').length;

  const handleSimulateCancellation = async () => {
    setIsSimulating(true);
    await emitAutomationEvent({
      id: `evt_sim_${Date.now()}`,
      type: AutomationEventType.APPOINTMENT_CANCELLED,
      timestamp: new Date().toISOString(),
      source: 'SYSTEM',
      payload: {
        appointmentId: 'apt_demo_sim',
        patientId: 'pat_demo_1',
        patientName: 'Laura Gómez',
        professionalId: 'prof_demo_1',
        startIso: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
        endIso: new Date(Date.now() + 4.75 * 3600 * 1000).toISOString(),
        reason: 'Cancelación de prueba desde consola',
      },
    });
    showToast('Evento APPOINTMENT_CANCELLED emitido · Pipeline ejecutado', 'success');
    setIsSimulating(false);
  };

  const handleSimulateDelay = async () => {
    setIsSimulating(true);
    await emitAutomationEvent({
      id: `evt_sim_del_${Date.now()}`,
      type: AutomationEventType.CLINIC_DELAY_CHANGED,
      timestamp: new Date().toISOString(),
      source: 'SYSTEM',
      payload: {
        professionalId: 'prof_demo_1',
        delayMinutes: 20,
        affectedAppointmentIds: ['apt_demo_2', 'apt_demo_3'],
      },
    });
    showToast('Evento CLINIC_DELAY_CHANGED emitido · Avisos proactivos enviados', 'success');
    setIsSimulating(false);
  };

  const handleSimulateOverdue = async () => {
    setIsSimulating(true);
    await emitAutomationEvent({
      id: `evt_sim_over_${Date.now()}`,
      type: AutomationEventType.APPOINTMENT_OVERDUE,
      timestamp: new Date().toISOString(),
      source: 'CRON_TIMER',
      payload: {
        appointmentId: 'apt_demo_1',
        patientId: 'pat_demo_1',
        patientName: 'Laura Gómez',
        professionalId: 'prof_demo_1',
        startIso: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        endIso: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      },
    });
    showToast('Evento APPOINTMENT_OVERDUE emitido · Alerta creada en Decision Center', 'info');
    setIsSimulating(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-[#121A17] p-6 rounded-3xl border border-stone-200/80 dark:border-stone-800 shadow-xs">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/40">
            <Cpu className="w-3.5 h-3.5" />
            <span>KineOS · Automation Engine</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900 dark:text-white">
            Motor de Automatizaciones
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 max-w-2xl">
            Gestiona la autonomía operativa del consultorio. Define qué tareas se resuelven en piloto automático (AUTO), cuáles requieren tu aprobación (ASK_PROFESSIONAL) y cuáles son manuales.
          </p>
        </div>

        <button
          onClick={resetRulesToDefault}
          className="px-3.5 py-2 rounded-xl border border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 inline-flex items-center gap-2 shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Restablecer reglas</span>
        </button>
      </div>

      {/* Live Operational Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#121A17] p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800">
          <div className="text-2xs text-stone-400 font-bold uppercase tracking-wider">Reglas Activas</div>
          <div className="text-2xl font-extrabold text-stone-900 dark:text-white mt-1">
            {activeCount} <span className="text-xs font-normal text-stone-400">/ {automationRules.length}</span>
          </div>
          <div className="text-2xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            100% monitoreadas
          </div>
        </div>

        <div className="bg-white dark:bg-[#121A17] p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800">
          <div className="text-2xs text-stone-400 font-bold uppercase tracking-wider">Modo AUTO</div>
          <div className="text-2xl font-extrabold text-teal-800 dark:text-teal-300 mt-1">
            {autoCount}
          </div>
          <div className="text-2xs text-stone-400 mt-1">
            Sin intervención humana
          </div>
        </div>

        <div className="bg-white dark:bg-[#121A17] p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800">
          <div className="text-2xs text-stone-400 font-bold uppercase tracking-wider">Decision Center</div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {askCount}
          </div>
          <div className="text-2xs text-stone-400 mt-1">
            Requieren 1-clic humano
          </div>
        </div>

        <div className="bg-white dark:bg-[#121A17] p-4 rounded-2xl border border-stone-200/80 dark:border-stone-800">
          <div className="text-2xs text-stone-400 font-bold uppercase tracking-wider">Pipeline de Eventos</div>
          <div className="text-2xl font-extrabold text-stone-800 dark:text-stone-100 mt-1">
            {automationLogs.length}
          </div>
          <div className="text-2xs text-stone-400 mt-1">
            Ejecuciones registradas
          </div>
        </div>
      </div>

      {/* Simulator Test Bar */}
      <div className="bg-stone-900 text-stone-100 p-4 sm:p-5 rounded-3xl shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-stone-300">
              Simulador de Eventos en Vivo (Disparadores de Prueba)
            </span>
          </div>
          <span className="text-2xs text-stone-400">
            Valida en tiempo real la arquitectura EVENT → REGLAS → DECISIÓN → ACCIÓN
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSimulateCancellation}
            disabled={isSimulating}
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200 inline-flex items-center gap-2 border border-stone-700 active:scale-95 transition-transform"
          >
            <Play className="w-3 h-3 text-red-400" />
            <span>Simular Cancelación (Auto-relleno Waitlist)</span>
          </button>

          <button
            onClick={handleSimulateDelay}
            disabled={isSimulating}
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200 inline-flex items-center gap-2 border border-stone-700 active:scale-95 transition-transform"
          >
            <Play className="w-3 h-3 text-amber-400" />
            <span>Simular Demora (+20 min)</span>
          </button>

          <button
            onClick={handleSimulateOverdue}
            disabled={isSimulating}
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-semibold text-stone-200 inline-flex items-center gap-2 border border-stone-700 active:scale-95 transition-transform"
          >
            <Play className="w-3 h-3 text-blue-400" />
            <span>Simular Paciente Retrasado (+15m)</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-stone-800 pb-2">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'rules'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800/60'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 inline mr-1.5" />
          Reglas y Niveles de Autonomía ({automationRules.length})
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'logs'
              ? 'bg-teal-700 text-white shadow-2xs'
              : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800/60'
          }`}
        >
          <Terminal className="w-3.5 h-3.5 inline mr-1.5" />
          Monitor del Pipeline en Tiempo Real ({automationLogs.length})
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-3">
          {automationRules.map((rule) => {
            return (
              <div
                key={rule.id}
                className={`bg-white dark:bg-[#121A17] rounded-3xl p-5 sm:p-6 border transition-all ${
                  rule.enabled
                    ? 'border-stone-200 dark:border-stone-800 shadow-2xs'
                    : 'border-stone-200/50 dark:border-stone-800/50 opacity-60'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Left: Info */}
                  <div className="space-y-1.5 max-w-2xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xs font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                        {rule.eventType}
                      </span>
                      <span className="text-2xs font-semibold text-stone-400">
                        Prioridad: {rule.priority}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-stone-900 dark:text-white">
                      {rule.name}
                    </h3>

                    <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                      {rule.description}
                    </p>

                    <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-2xs text-stone-500">
                      <div>
                        <strong>Condición:</strong> {rule.conditionsDescription}
                      </div>
                      <div>
                        <strong>Acción:</strong> {rule.actionsDescription}
                      </div>
                    </div>
                  </div>

                  {/* Right: Autonomy Level Select & Toggle */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 p-1 rounded-2xl">
                      {(['AUTO', 'ASK_PROFESSIONAL', 'MANUAL_ONLY'] as AutomationLevel[]).map((level) => {
                        const isSelected = rule.level === level;
                        return (
                          <button
                            key={level}
                            onClick={() => updateRuleLevel(rule.id, level)}
                            disabled={!rule.enabled}
                            className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all ${
                              isSelected
                                ? level === 'AUTO'
                                  ? 'bg-teal-700 text-white shadow-xs'
                                  : level === 'ASK_PROFESSIONAL'
                                  ? 'bg-amber-600 text-white shadow-xs'
                                  : 'bg-stone-700 text-white'
                                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                            }`}
                          >
                            {level === 'AUTO' ? 'AUTO' : level === 'ASK_PROFESSIONAL' ? 'CONSULTAR' : 'MANUAL'}
                          </button>
                        );
                      })}
                    </div>

                    {/* Enable / Disable switch */}
                    <button
                      onClick={() => toggleRuleEnabled(rule.id, !rule.enabled)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                        rule.enabled
                          ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/60'
                          : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                      }`}
                    >
                      {rule.enabled ? 'Activa' : 'Pausada'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="bg-stone-900 text-stone-200 rounded-3xl p-6 border border-stone-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-stone-800 pb-3">
            <div className="flex items-center gap-2 text-stone-300 font-bold">
              <Activity className="w-4 h-4 text-teal-400 animate-pulse" />
              <span>Pipeline en Vivo: EVENTO → REGLAS → DECISIÓN → ACCIÓN → AUDITORÍA</span>
            </div>
            <span className="text-2xs text-stone-500">
              Últimas {automationLogs.length} ejecuciones
            </span>
          </div>

          {automationLogs.length === 0 ? (
            <div className="py-8 text-center text-stone-500">
              No hay ejecuciones recientes en memoria. Usá los botones de simulación arriba para probar el flujo.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
              {automationLogs.map((log) => {
                const isSuccess = log.status === 'EXECUTED';
                const isDecision = log.status === 'QUEUED_FOR_DECISION';

                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl border ${
                      isDecision
                        ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                        : isSuccess
                        ? 'bg-teal-950/20 border-teal-800/40 text-stone-200'
                        : 'bg-stone-800/40 border-stone-800 text-stone-400'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-2xs px-2 py-0.5 rounded font-bold ${
                            isDecision
                              ? 'bg-amber-500 text-amber-950'
                              : isSuccess
                              ? 'bg-teal-600 text-white'
                              : 'bg-stone-700 text-stone-300'
                          }`}
                        >
                          {log.status}
                        </span>
                        <span className="text-teal-400 font-bold">{log.eventType}</span>
                        <span className="text-stone-400">· {log.ruleName}</span>
                      </div>

                      <div className="text-2xs text-stone-500">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                    </div>

                    <div className="mt-1 text-2xs sm:text-xs text-stone-300">
                      {log.details}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
