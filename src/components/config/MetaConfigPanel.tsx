import React, { useState } from 'react';
import {
  Sparkles,
  Activity,
  Send,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
  CheckSquare,
  Square,
  Key,
  Smartphone,
  Info,
  HelpCircle,
} from 'lucide-react';
import { MetaWhatsAppService } from '../../services/whatsapp/MetaWhatsAppService.ts';

interface MetaConfigPanelProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const MetaConfigPanel: React.FC<MetaConfigPanelProps> = ({ showToast }) => {
  const [testPhone, setTestPhone] = useState('+54 9 343 622-4149');
  const [sendingMetaTest, setSendingMetaTest] = useState(false);
  const [metaTestResult, setMetaTestResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<{
    status: string;
    configured: boolean;
    logs: string[];
    provider: string;
  } | null>(null);

  const [copiedEnv, setCopiedEnv] = useState(false);

  // Lista de verificación visual interactiva
  const [checklist, setChecklist] = useState({
    appCreated: false,
    whatsappProductAdded: false,
    phoneIdCopied: false,
    accessTokenCopied: false,
    testNumberVerified: false,
    envSecretsLoaded: false,
  });

  const toggleChecklistItem = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const totalChecklist = Object.keys(checklist).length;
  const progressPercent = Math.round((completedCount / totalChecklist) * 100);

  const envTemplate = `META_WHATSAPP_PHONE_NUMBER_ID="TU_PHONE_NUMBER_ID_AQUÍ"\nMETA_WHATSAPP_ACCESS_TOKEN="TU_ACCESS_TOKEN_AQUÍ"`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopiedEnv(true);
    showToast('Plantilla .env copiada al portapapeles', 'info');
    setTimeout(() => setCopiedEnv(false), 2000);
  };

  const handleRunMetaDiagnostic = async () => {
    setDiagnosticLoading(true);
    setDiagnosticResult(null);

    try {
      const res = await MetaWhatsAppService.runServerDiagnostic();
      setDiagnosticResult({
        status: res.status,
        configured: res.configured,
        logs: res.logs,
        provider: res.connectionDetails?.provider || 'CLICK_TO_CHAT_FALLBACK',
      });
      showToast('Diagnóstico de Meta completado', res.configured ? 'success' : 'info');
    } catch (err: any) {
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
          message: `✅ Plantilla 'hello_world' enviada con éxito. ID de mensaje (wamid): ${result.messageId}`,
          details: result.details,
        });
        showToast('Plantilla WhatsApp enviada con éxito', 'success');
      } else {
        setMetaTestResult({
          success: false,
          message: `❌ Error de Meta: ${result.error || 'No se pudo enviar la plantilla'}`,
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

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-stone-900 text-white rounded-3xl p-6 shadow-md border border-teal-700/50 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-400/30">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold tracking-tight">
              Panel de Configuración & Guía Meta WhatsApp Cloud API
            </h2>
            <p className="text-xs text-teal-100/80">
              Paso a paso para obtener credenciales e integrar la API Oficial de Meta (<code className="font-mono text-teal-200">graph.facebook.com</code>).
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Verificación Visual (Checklist de Progreso) */}
      <div className="bg-white dark:bg-[#121B17] rounded-2xl border border-teal-200 dark:border-teal-900/60 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Lista de Verificación Visual (Meta Portal Setup Checklist)</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Marcá cada casilla a medida que completes las acciones en el portal Meta for Developers.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-stone-100 dark:bg-[#15221C] px-3 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 self-start sm:self-center">
            <span className="text-xs font-bold text-teal-800 dark:text-teal-300 font-mono">
              {completedCount} / {totalChecklist} completados ({progressPercent}%)
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-stone-200 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
          <div
            className="bg-teal-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
          <button
            type="button"
            onClick={() => toggleChecklistItem('appCreated')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
              checklist.appCreated
                ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-100'
                : 'bg-stone-50/80 dark:bg-[#15221C] border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            {checklist.appCreated ? (
              <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block">1. Crear App de Empresa en Meta</span>
              <span className="text-[11px] opacity-80">App creada tipo Business en developers.facebook.com</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => toggleChecklistItem('whatsappProductAdded')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
              checklist.whatsappProductAdded
                ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-100'
                : 'bg-stone-50/80 dark:bg-[#15221C] border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            {checklist.whatsappProductAdded ? (
              <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block">2. Configurar Producto WhatsApp</span>
              <span className="text-[11px] opacity-80">Producto WhatsApp activado dentro del panel de la App</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => toggleChecklistItem('phoneIdCopied')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
              checklist.phoneIdCopied
                ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-100'
                : 'bg-stone-50/80 dark:bg-[#15221C] border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            {checklist.phoneIdCopied ? (
              <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block">3. Copiar Phone Number ID</span>
              <span className="text-[11px] opacity-80">Identificador de número obtenido (~15 dígitos)</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => toggleChecklistItem('accessTokenCopied')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
              checklist.accessTokenCopied
                ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-100'
                : 'bg-stone-50/80 dark:bg-[#15221C] border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            {checklist.accessTokenCopied ? (
              <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block">4. Copiar Access Token</span>
              <span className="text-[11px] opacity-80">Token de acceso (temporal 24h o System User)</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => toggleChecklistItem('testNumberVerified')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
              checklist.testNumberVerified
                ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-100'
                : 'bg-stone-50/80 dark:bg-[#15221C] border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            {checklist.testNumberVerified ? (
              <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block">5. Verificar Número +54 9 343 622-4149</span>
              <span className="text-[11px] opacity-80">Agregado a "To / Para" en Meta y verificado por SMS/WhatsApp</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => toggleChecklistItem('envSecretsLoaded')}
            className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
              checklist.envSecretsLoaded
                ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-100'
                : 'bg-stone-50/80 dark:bg-[#15221C] border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300'
            }`}
          >
            {checklist.envSecretsLoaded ? (
              <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
            ) : (
              <Square className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            )}
            <div>
              <span className="font-bold block">6. Pegar Secrets en archivo .env</span>
              <span className="text-[11px] opacity-80">Variables cargadas en servidor y probadas con hello_world</span>
            </div>
          </button>
        </div>
      </div>

      {/* Guía Paso a Paso Detallada para Obtener Credenciales */}
      <div className="bg-white dark:bg-[#121B17] rounded-2xl border border-stone-200/80 dark:border-stone-800 p-5 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Key className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Guía Detallada Paso a Paso: Obtención de Phone Number ID y Access Token</span>
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Sigue estas instrucciones ilustradas para configurar tu cuenta en el portal oficial de Meta.
            </p>
          </div>

          <a
            href="https://developers.facebook.com/apps/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-teal-700 dark:text-teal-400 font-bold hover:underline flex items-center gap-1 bg-teal-50 dark:bg-teal-950/60 px-3 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800"
          >
            <span>Portal Meta Developers</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-4 text-xs">
          {/* Paso 1 */}
          <div className="p-4 rounded-2xl bg-stone-50/80 dark:bg-[#15221C] border border-stone-200/80 dark:border-stone-800 space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-xs">
                1
              </span>
              <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs sm:text-sm">
                Crear o Seleccionar una Aplicación en Meta for Developers
              </h4>
            </div>
            <div className="pl-8 text-stone-600 dark:text-stone-300 space-y-1.5 text-[11px] leading-relaxed">
              <p>
                1. Ingresa a <strong className="text-stone-900 dark:text-stone-100">developers.facebook.com/apps</strong> e inicia sesión con tu cuenta de Facebook.
              </p>
              <p>
                2. Haz clic en el botón azul <strong className="text-stone-900 dark:text-stone-100">Crear aplicación (Create App)</strong>.
              </p>
              <p>
                3. Selecciona la opción <strong className="text-stone-900 dark:text-stone-100">Otros / Empresa (Business)</strong> como tipo de uso para habilitar las APIs empresariales.
              </p>
              <p>
                4. Asigna un nombre a tu app (ejemplo: <code>KineTurnos Consultorio</code>) y selecciona tu cuenta de Administrador Comercial.
              </p>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="p-4 rounded-2xl bg-stone-50/80 dark:bg-[#15221C] border border-stone-200/80 dark:border-stone-800 space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-xs">
                2
              </span>
              <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs sm:text-sm">
                Agregar y Configurar el Producto "WhatsApp"
              </h4>
            </div>
            <div className="pl-8 text-stone-600 dark:text-stone-300 space-y-1.5 text-[11px] leading-relaxed">
              <p>
                1. En el panel principal de tu aplicación recién creada, desplázate hacia abajo hasta la sección <strong className="text-stone-900 dark:text-stone-100">Agregar un producto</strong>.
              </p>
              <p>
                2. Busca la tarjeta <strong className="text-stone-900 dark:text-stone-100">WhatsApp</strong> y haz clic en <strong className="text-teal-700 dark:text-teal-400">Configurar (Set up)</strong>.
              </p>
              <p>
                3. Acepta los términos de Meta Business y selecciona o crea tu cuenta de WhatsApp Business asociada.
              </p>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="p-4 rounded-2xl bg-stone-50/80 dark:bg-[#15221C] border border-stone-200/80 dark:border-stone-800 space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-xs">
                3
              </span>
              <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs sm:text-sm">
                Copiar el Phone Number ID y el Access Token
              </h4>
            </div>
            <div className="pl-8 text-stone-600 dark:text-stone-300 space-y-2 text-[11px] leading-relaxed">
              <p>
                1. En el menú lateral izquierdo, ve a <strong className="text-stone-900 dark:text-stone-100">WhatsApp → Configuración de la API (API Setup)</strong>.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1">
                  <span className="font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1">
                    <Key className="w-3.5 h-3.5" /> Phone Number ID:
                  </span>
                  <p className="text-[10px] text-stone-500">
                    Bajo el título "Paso 1: Seleccionar un número", verás el campo <code className="font-mono text-stone-800 dark:text-stone-200">Identificador de número de teléfono</code>. Es una secuencia de 15 dígitos (ej: <code>109823741234901</code>). Copia este valor.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-1">
                  <span className="font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Access Token:
                  </span>
                  <p className="text-[10px] text-stone-500">
                    En el bloque superior, copia el <code className="font-mono text-stone-800 dark:text-stone-200">Token de acceso temporal</code> (comienza con <code>EAAG...</code>). *Nota: Expira en 24 horas. Para producción permanente usa Usuarios del sistema.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Paso 4 */}
          <div className="p-4 rounded-2xl bg-stone-50/80 dark:bg-[#15221C] border border-stone-200/80 dark:border-stone-800 space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-xs">
                4
              </span>
              <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs sm:text-sm flex items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-teal-600" />
                <span>Registrar el Número de Prueba: +54 9 343 622-4149</span>
              </h4>
            </div>
            <div className="pl-8 text-stone-600 dark:text-stone-300 space-y-1.5 text-[11px] leading-relaxed">
              <p>
                En el entorno Sandbox de prueba, Meta solo permite enviar mensajes a números de teléfono de prueba previamente autorizados.
              </p>
              <p>
                1. En la misma pantalla de <strong className="text-stone-900 dark:text-stone-100">Configuración de la API</strong>, busca el campo desplegable <strong className="text-stone-900 dark:text-stone-100">Para (To)</strong>.
              </p>
              <p>
                2. Selecciona <strong className="text-teal-700 dark:text-teal-400">Administrar lista de números de teléfono (Manage phone number list)</strong>.
              </p>
              <p>
                3. Ingresa tu código de país (<code className="font-mono">+54 Argentina</code>) y tu número móvil: <code className="font-mono bg-stone-200 dark:bg-stone-800 px-1 rounded font-bold">9 343 622-4149</code>.
              </p>
              <p>
                4. Recibirás un mensaje de WhatsApp o SMS de Meta con un código de 6 dígitos. Ingrésalo en la pantalla de Meta para completar la verificación.
              </p>
            </div>
          </div>

          {/* Paso 5 */}
          <div className="p-4 rounded-2xl bg-stone-50/80 dark:bg-[#15221C] border border-stone-200/80 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-teal-700 text-white flex items-center justify-center font-bold text-xs">
                  5
                </span>
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-xs sm:text-sm">
                  Cargar los Secrets en el archivo .env del Servidor
                </h4>
              </div>
              <button
                type="button"
                onClick={handleCopyEnv}
                className="px-2.5 py-1 text-[10px] font-bold bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-lg flex items-center gap-1 transition-colors"
              >
                {copiedEnv ? <Check className="w-3 h-3 text-teal-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedEnv ? 'Copiado' : 'Copiar .env'}</span>
              </button>
            </div>

            <div className="pl-8 space-y-2 text-[11px]">
              <p className="text-stone-600 dark:text-stone-300">
                Creá un archivo llamado <code className="font-mono font-bold bg-stone-200 dark:bg-stone-800 px-1 rounded">.env</code> en la raíz del proyecto y pegá las credenciales obtenidas:
              </p>

              <pre className="p-3 rounded-xl bg-stone-900 text-teal-300 font-mono text-[11px] overflow-x-auto">
                {envTemplate}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Consola de Diagnóstico Handshake Server-Side */}
      <div className="bg-white dark:bg-[#121B17] rounded-2xl border border-stone-200/80 dark:border-stone-800 p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold text-sm">
            <Terminal className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>Consola de Diagnóstico Handshake Server-Side</span>
          </div>
          <button
            onClick={handleRunMetaDiagnostic}
            disabled={diagnosticLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs transition-all shadow-xs disabled:opacity-50"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{diagnosticLoading ? 'Verificando Servidor...' : 'EJECUTAR DIAGNÓSTICO HANDSHAKE'}</span>
          </button>
        </div>

        {diagnosticResult && (
          <div
            className={`p-4 text-xs rounded-2xl border font-mono space-y-2 ${
              diagnosticResult.configured
                ? 'bg-teal-950/90 text-teal-200 border-teal-700'
                : 'bg-stone-950/95 text-amber-300 border-amber-800/80'
            }`}
          >
            <div className="font-bold flex items-center justify-between border-b border-current/20 pb-2">
              <span>ESTADO DE CONEXIÓN CON EXPRESS: {diagnosticResult.status}</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-black/40 text-stone-100">
                PROVEEDOR: {diagnosticResult.provider}
              </span>
            </div>

            <div className="space-y-1 text-[11px] font-mono leading-relaxed pt-1">
              {diagnosticResult.logs.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>

            <div className="text-[10px] text-stone-400 pt-2 border-t border-current/20 italic">
              Seguridad: 0 secreto o token expuesto en las respuestas del cliente React.
            </div>
          </div>
        )}
      </div>

      {/* Probador de Envío Real hello_world */}
      <div className="bg-white dark:bg-[#121B17] rounded-2xl border border-teal-200 dark:border-teal-900/60 p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-stone-900 dark:text-stone-100 font-bold text-sm">
          <Send className="w-5 h-5 text-teal-600 dark:text-teal-400" />
          <span>Probador de Envío Real de Plantilla Oficial (`hello_world`)</span>
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400">
          Envía la plantilla pre-aprobada <code className="bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded font-mono text-[11px]">hello_world</code> directamente al celular verificado.
        </p>

        <div className="space-y-3 pt-1">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
            <input
              type="text"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="Número de prueba autorizado (ej: +54 9 343 622-4149)"
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
    </div>
  );
};
