import React, { useState } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import {
  Settings,
  Bell,
  Clock,
  RotateCcw,
  Check,
  AlertTriangle,
  Send,
  Database,
  Calendar,
  Layers,
  Sparkles,
  Activity,
  MessageSquare,
  DollarSign,
  Phone,
  User,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { DataMode } from '../../types/index.ts';
import { MetaWhatsAppService } from '../../services/whatsapp/MetaWhatsAppService.ts';
import { MetaConfigPanel } from './MetaConfigPanel.tsx';
import { TwilioConfigPanel } from './TwilioConfigPanel.tsx';

export const ConfigScreen: React.FC = () => {
  const {
    config,
    setConfig,
    dataMode,
    setDataMode,
    resetDemoData,
    runAppointmentReminders,
    professionals,
    showToast,
    setIsResetConfirmModalOpen,
  } = useKineStore();

  const [activeTab, setActiveTab] = useState<'GENERAL' | 'META' | 'TWILIO'>('GENERAL');

  // Campos de Configuración Operativa (Prompt Maestro 01)
  const [clinicName, setClinicName] = useState(config.clinicName);
  const [consultationFee, setConsultationFee] = useState(config.consultationFee || 15000);
  const [durationMinutes, setDurationMinutes] = useState(config.defaultAppointmentDurationMinutes || 45);
  const [publicPhone, setPublicPhone] = useState(config.publicWhatsAppNumber || '+1 737 221 2163');
  const [internalPhone, setInternalPhone] = useState(config.kinesiologistInternalPhone || '+54 9 343 622-4149');
  const [receptionPhone, setReceptionPhone] = useState(config.receptionPhone || '+54 9 343 622-4149');
  const [delayMinutes, setDelayMinutes] = useState(config.currentDelayMinutes || 0);
  const [requireApprovalNew, setRequireApprovalNew] = useState(
    config.approvalRules?.requireApprovalForNewAppointment ?? true
  );
  const [requireApprovalCancel, setRequireApprovalCancel] = useState(
    config.approvalRules?.requireApprovalForCancellation ?? false
  );
  const [requireApprovalResched, setRequireApprovalResched] = useState(
    config.approvalRules?.requireApprovalForRescheduling ?? true
  );

  const handleSaveOperationalConfig = () => {
    setConfig((prev) => ({
      ...prev,
      clinicName,
      consultationFee: Number(consultationFee),
      defaultAppointmentDurationMinutes: Number(durationMinutes),
      publicWhatsAppNumber: publicPhone,
      kinesiologistInternalPhone: internalPhone,
      receptionPhone,
      currentDelayMinutes: Number(delayMinutes),
      approvalRules: {
        requireApprovalForNewAppointment: requireApprovalNew,
        requireApprovalForCancellation: requireApprovalCancel,
        requireApprovalForRescheduling: requireApprovalResched,
      },
    }));
    showToast('Configuración del consultorio guardada con éxito', 'success');
  };

  const [runningReminders, setRunningReminders] = useState(false);
  const [remindersReport, setRemindersReport] = useState<string | null>(null);

  // Estado para prueba de envío real y diagnóstico con Meta WhatsApp Cloud API
  const [testPhone, setTestPhone] = useState('+54 9 343 622-4149');
  const [sendingMetaTest, setSendingMetaTest] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    status: string;
    configured: boolean;
    logs: string[];
    provider: string;
  } | null>(null);

  const handleRunMetaDiagnostic = async () => {
    setDiagnosticLoading(true);
    setDiagnosticResult(null);

    try {
      // Diagnostic server call via MetaWhatsAppService (client-safe, 0 secret tokens exposed)
      const res = await MetaWhatsAppService.runServerDiagnostic();

      console.log('[Meta Diagnostic Server Logs]', res.logs);

      setDiagnosticResult({
        status: res.status,
        configured: res.configured,
        logs: res.logs,
        provider: res.connectionDetails?.provider || 'CLICK_TO_CHAT_FALLBACK',
      });

      showToast('Diagnóstico de Meta completado', res.configured ? 'success' : 'info');
    } catch (err: any) {
      console.error('[Meta Diagnostic Error]', err);
      setDiagnosticResult({
        status: 'ERROR',
        configured: false,
        logs: [`[Error] Fallo al ejecutar diagnóstico: ${err.message || err}`],
        provider: 'ERROR',
      });
      showToast('Error al ejecutar diagnóstico de Meta', 'error');
    } finally {
      setDiagnosticLoading(false);
    }
  };

  const handleSendMetaTestTemplate = async () => {
    if (!testPhone.trim()) {
      showToast('Por favor ingrese un número de teléfono de prueba', 'error');
      return;
    }

    setSendingMetaTest(true);
    setMetaTestResult(null);

    try {
      const result = await MetaWhatsAppService.sendTestHelloWorld(testPhone);

      if (result.success) {
        setMetaTestResult({
          success: true,
          message: `✅ Plantilla 'hello_world' enviada con éxito. ID de mensaje: ${result.messageId}`,
          details: result.details,
        });
        showToast('Plantilla WhatsApp enviada con éxito', 'success');
      } else {
        setMetaTestResult({
          success: false,
          message: `❌ Error: ${result.error || 'No se pudo enviar la plantilla'}`,
          details: result.details,
        });
        showToast(result.error || 'Fallo en el envío de plantilla Meta', 'error');
      }
    } catch (err: any) {
      setMetaTestResult({
        success: false,
        message: `❌ Error de red o servidor: ${err.message || err}`,
      });
      showToast('Error al conectar con el servidor', 'error');
    } finally {
      setSendingMetaTest(false);
    }
  };

  const handleRunReminders = async () => {
    setRunningReminders(true);
    setRemindersReport(null);
    try {
      const res = await runAppointmentReminders();
      if (res.sentCount > 0) {
        setRemindersReport(
          `✅ Se prepararon ${res.sentCount} recordatorios para WhatsApp con éxito.`
        );
      } else {
        setRemindersReport(
          'ℹ️ No hay turnos próximos que requieran recordatorio dentro del margen de 24 horas.'
        );
      }
    } finally {
      setRunningReminders(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-150">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-teal-700 dark:text-teal-400" />
            <span>Configuración Operativa del Consultorio</span>
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
            Ajustes de persistencia local, motor de recordatorios, integración Meta Cloud API y profesionales.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center bg-stone-200/70 dark:bg-stone-800/80 p-1 rounded-2xl border border-stone-300/60 dark:border-stone-700/60 self-start sm:self-center">
          <button
            onClick={() => setActiveTab('GENERAL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'GENERAL'
                ? 'bg-white dark:bg-[#121B17] text-stone-900 dark:text-stone-100 shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>General</span>
          </button>
          <button
            onClick={() => setActiveTab('META')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'META'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Meta Cloud API</span>
          </button>
          <button
            onClick={() => setActiveTab('TWILIO')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'TWILIO'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Twilio WhatsApp</span>
          </button>
        </div>
      </div>

      {activeTab === 'META' ? (
        <MetaConfigPanel showToast={showToast} />
      ) : activeTab === 'TWILIO' ? (
        <TwilioConfigPanel showToast={showToast} />
      ) : (
        <>
          {/* Parámetros Operativos del Consultorio (Prompt Maestro 01) */}
          <div className="bg-white dark:bg-[#121B17] rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-stone-900 dark:text-stone-100">
                    Parámetros Operativos del Consultorio
                  </h2>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Configuración editable de aranceles, números de contacto, duración de sesiones y reglas de aprobación.
                  </p>
                </div>
              </div>

              <button
                onClick={handleSaveOperationalConfig}
                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-700 hover:bg-teal-800 active:scale-95 text-white font-extrabold text-xs shadow-md transition-all self-start sm:self-center"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Parámetros</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Nombre del consultorio */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 dark:text-stone-300">
                  Nombre del Consultorio:
                </label>
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Arancel de la sesión */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-stone-400" />
                  <span>Arancel por Sesión ($):</span>
                </label>
                <input
                  type="number"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Duración del turno */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Duración del Turno (minutos):</span>
                </label>
                <input
                  type="number"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Número WhatsApp Público */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>WhatsApp Público (Pacientes):</span>
                </label>
                <input
                  type="text"
                  value={publicPhone}
                  onChange={(e) => setPublicPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Número Interno Kinesiólogo */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>Número Interno del Kinesiólogo:</span>
                </label>
                <input
                  type="text"
                  value={internalPhone}
                  onChange={(e) => setInternalPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Número de Recepción */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>Número de Recepción:</span>
                </label>
                <input
                  type="text"
                  value={receptionPhone}
                  onChange={(e) => setReceptionPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Demora Actual en Consultorio */}
              <div className="space-y-1.5">
                <label className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                  <span>Demora Actual en Sala (minutos):</span>
                </label>
                <input
                  type="number"
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-stone-100 font-mono text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              {/* Profesionales Activos */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  <span>Profesionales Habilitados:</span>
                </label>
                <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 flex flex-wrap gap-2">
                  {professionals.map((p) => (
                    <span
                      key={p.id}
                      className="px-2.5 py-1 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 text-[11px]"
                    >
                      {p.displayName} ({p.licenseNumber || 'Matrícula Oficial'})
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Reglas de Aprobación */}
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200 dark:border-stone-800 space-y-3">
              <span className="text-xs font-extrabold text-stone-800 dark:text-stone-200 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Reglas de Aprobación del Kinesiólogo</span>
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireApprovalNew}
                    onChange={(e) => setRequireApprovalNew(e.target.checked)}
                    className="rounded accent-teal-600 cursor-pointer"
                  />
                  <span className="font-medium text-stone-800 dark:text-stone-200">
                    Aprobar turnos nuevos (alerta con sonido)
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireApprovalResched}
                    onChange={(e) => setRequireApprovalResched(e.target.checked)}
                    className="rounded accent-teal-600 cursor-pointer"
                  />
                  <span className="font-medium text-stone-800 dark:text-stone-200">
                    Aprobar reprogramaciones
                  </span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireApprovalCancel}
                    onChange={(e) => setRequireApprovalCancel(e.target.checked)}
                    className="rounded accent-teal-600 cursor-pointer"
                  />
                  <span className="font-medium text-stone-800 dark:text-stone-200">
                    Aprobar cancelaciones
                  </span>
                </label>
              </div>
            </div>
          </div>

      {/* Persistence & Data Mode (Reglas 4 & 5) */}
      <div className="bg-white dark:bg-[#121B17] rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Modo de Datos & Persistencia del Sistema
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Los cambios se guardan localmente para operar la aplicación de forma continua.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
            {dataMode === 'DEMO_PERSISTENT' ? 'PERSISTENTE' : dataMode === 'DEMO_MEMORY' ? 'MEMORIA' : 'FIREBASE'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {(['DEMO_PERSISTENT', 'DEMO_MEMORY', 'FIREBASE'] as DataMode[]).map((mode) => {
            const isSelected = dataMode === mode;
            const modeLabel =
              mode === 'DEMO_PERSISTENT'
                ? 'PERSISTENTE_LOCAL'
                : mode === 'DEMO_MEMORY'
                ? 'MEMORIA_VOLATIL'
                : 'FIREBASE_CLOUD';
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setDataMode(mode)}
                className={`p-3.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 text-teal-950 dark:text-teal-200 shadow-2xs font-semibold'
                    : 'bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-teal-300'
                }`}
              >
                <div className="text-xs font-bold font-mono">{modeLabel}</div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                  {mode === 'DEMO_PERSISTENT' && 'Persiste en almacenamiento local al recargar (Recomendado).'}
                  {mode === 'DEMO_MEMORY' && 'En memoria volátil (se reinicia al recargar la página).'}
                  {mode === 'FIREBASE' && 'Conexión a Firestore Cloud para entorno de producción.'}
                </div>
              </button>
            );
          })}
        </div>

        <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div className="text-xs text-stone-500 dark:text-stone-400">
            ¿Querés volver al conjunto de datos inicial del sistema?
          </div>
          <button
            onClick={() => setIsResetConfirmModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl hover:bg-rose-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTABLECER DATOS INICIALES</span>
          </button>
        </div>
      </div>

      {/* Recordatorios Automáticos & Botón de Testing (Regla 25) */}
      <div className="bg-white dark:bg-[#121B17] rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Motor de Recordatorios por WhatsApp
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Envío previo a turnos para que los pacientes confirmen o cancelen con 1 respuesta.
              </p>
            </div>
          </div>
          <button
            onClick={handleRunReminders}
            disabled={runningReminders}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold rounded-xl text-xs transition-all shadow-xs disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{runningReminders ? 'Verificando...' : 'EJECUTAR RECORDATORIOS AHORA'}</span>
          </button>
        </div>

        {remindersReport && (
          <div className="p-3 text-xs rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-200 dark:border-amber-800">
            {remindersReport}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-stone-50 dark:bg-[#15221C] p-3.5 rounded-xl border border-stone-200/60 dark:border-stone-800">
          <div>
            <span className="font-semibold text-stone-700 dark:text-stone-300">Anticipación:</span>
            <div className="text-stone-500 dark:text-stone-400 mt-0.5">24 horas antes del turno</div>
          </div>
          <div>
            <span className="font-semibold text-stone-700 dark:text-stone-300">Respuestas soportadas por WhatsApp:</span>
            <div className="text-stone-500 dark:text-stone-400 mt-0.5">"CONFIRMAR" (confirms) · "CANCELAR" (libera slot)</div>
          </div>
        </div>
      </div>

      {/* Prueba de Envío Real con Meta WhatsApp Cloud API */}
      <div className="bg-white dark:bg-[#121B17] rounded-2xl border border-teal-200 dark:border-teal-900/60 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <div>
              <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Prueba de Envío Real — Meta WhatsApp Cloud API
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Envía la plantilla oficial <code className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded font-mono text-[11px]">hello_world</code> utilizando credenciales server-side (<code className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded font-mono text-[11px]">META_WHATSAPP_ACCESS_TOKEN</code>).
              </p>
            </div>
          </div>
          <button
            onClick={handleRunMetaDiagnostic}
            disabled={diagnosticLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold rounded-xl text-xs transition-all border border-stone-300 dark:border-stone-700 disabled:opacity-50"
          >
            <Activity className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>{diagnosticLoading ? 'Probando Handshake...' : 'DIAGNÓSTICO HANDSHAKE'}</span>
          </button>
        </div>

        {/* Diagnostic Handshake Output Panel */}
        {diagnosticResult && (
          <div
            className={`p-3.5 text-xs rounded-xl border font-mono space-y-2 ${
              diagnosticResult.configured
                ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200 border-teal-200 dark:border-teal-800'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800'
            }`}
          >
            <div className="font-bold flex items-center justify-between border-b border-current/10 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                <span>Estado Servidor: {diagnosticResult.status}</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-white/60 dark:bg-black/30">
                PROVEEDOR: {diagnosticResult.provider}
              </span>
            </div>

            <div className="space-y-1 text-[11px] opacity-90">
              {diagnosticResult.logs.map((log, idx) => (
                <div key={idx} className="font-mono">
                  {log}
                </div>
              ))}
            </div>

            <div className="text-[10px] opacity-75 pt-1 border-t border-current/10 italic">
              Seguridad: Validación puramente en servidor Node.js. 0 token secreto expuesto en el cliente React.
            </div>
          </div>
        )}

        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <input
              type="text"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Número de prueba autorizado (ej: 5493515550199)"
              className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-[#15221C] text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono"
            />
            <button
              onClick={handleSendMetaTestTemplate}
              disabled={sendingMetaTest}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-all shadow-xs disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingMetaTest ? 'Enviando a Meta...' : 'ENVIAR TEMPLATE HELLO_WORLD (META)'}</span>
            </button>
          </div>

          {metaTestResult && (
            <div
              className={`p-3.5 text-xs rounded-xl border font-mono whitespace-pre-wrap ${
                metaTestResult.success
                  ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 border-teal-200 dark:border-teal-800'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800'
              }`}
            >
              <div className="font-bold mb-1">{metaTestResult.message}</div>
              {metaTestResult.details && (
                <div className="text-[11px] opacity-80 mt-1 overflow-x-auto">
                  {JSON.stringify(metaTestResult.details, null, 2)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Profesionales del Consultorio (Regla 6) */}
      <div className="bg-white dark:bg-[#121B17] rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5">
          <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Profesionales & Colisiones Independientes
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Cada profesional cuenta con horarios y colisiones estrictamente propias.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {professionals.map((prof) => (
            <div
              key={prof.id}
              className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-[#15221C] space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-stone-900 dark:text-stone-100">{prof.displayName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                  Activo
                </span>
              </div>
              <div className="text-xs text-stone-500 dark:text-stone-400">
                {prof.specialty || 'Kinesiología general'}
              </div>
              <div className="text-[11px] text-stone-400">
                Duración por defecto: {prof.defaultDurationMinutes} min
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Horarios Multi-Franja (Regla 9) */}
      <div className="bg-white dark:bg-[#121B17] rounded-2xl border border-stone-200 dark:border-stone-800 p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2.5">
          <Clock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <div>
            <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Horarios de Atención Multi-Franja
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Doble turno diario con receso intermedio: 08:00 a 12:00 y 15:00 a 19:00 hs.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#15221C] border border-stone-200/60 dark:border-stone-800">
            <div className="font-bold text-stone-800 dark:text-stone-200">Turno Mañana:</div>
            <div className="font-mono text-stone-600 dark:text-stone-400 mt-0.5">08:00 - 12:00 hs</div>
          </div>
          <div className="p-3 rounded-xl bg-stone-50 dark:bg-[#15221C] border border-stone-200/60 dark:border-stone-800">
            <div className="font-bold text-stone-800 dark:text-stone-200">Turno Tarde:</div>
            <div className="font-mono text-stone-600 dark:text-stone-400 mt-0.5">15:00 - 19:00 hs</div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
