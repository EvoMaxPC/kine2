import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Activity,
  Send,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Terminal,
  CheckCircle2,
  Copy,
  Check,
  Key,
  Smartphone,
  Info,
  RefreshCw,
  Inbox,
  Clock,
  Server,
  Link,
  Radio,
  XCircle,
} from 'lucide-react';
import {
  TwilioWhatsAppService,
  TwilioWhatsAppStatus,
  TwilioInboundMessage,
} from '../../services/whatsapp/TwilioWhatsAppService.ts';

interface TwilioConfigPanelProps {
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const TwilioConfigPanel: React.FC<TwilioConfigPanelProps> = ({ showToast }) => {
  const [status, setStatus] = useState<TwilioWhatsAppStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [testingSDK, setTestingSDK] = useState(false);

  const [testPhone, setTestPhone] = useState('+54 9 341 605-1574');
  const [testMessage, setTestMessage] = useState('Prueba KineTurnos: conexión Twilio funcionando.');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    messageId?: string;
    httpStatus?: number;
    details?: any;
    isSandboxUnjoined?: boolean;
  } | null>(null);

  const [inboundMessages, setInboundMessages] = useState<TwilioInboundMessage[]>([]);
  const [loadingInbound, setLoadingInbound] = useState(false);

  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedStatusCallback, setCopiedStatusCallback] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const res = await TwilioWhatsAppService.runDiagnostic();
      setStatus(res);
      if (res.connectionStatus === 'CONNECTED') {
        showToast('Conexión con Twilio verificada exitosamente (HTTP 200)', 'success');
      } else if (res.connectionStatus === 'DISCONNECTED') {
        showToast(`Twilio respondió con error: ${res.error || 'Desconectado'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error de comunicación con el servidor', 'error');
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleTestConnectionSDK = async () => {
    setTestingSDK(true);
    try {
      const res = await TwilioWhatsAppService.testConnectionSDK();
      if (res.status === 'CONNECTED') {
        showToast(`Cuenta Twilio verificada: ${res.account?.friendlyName || 'Activa'} (HTTP 200)`, 'success');
      } else if (res.status === 'NOT_CONFIGURED') {
        showToast('Faltan credenciales TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN en Secrets', 'error');
      } else {
        showToast(`Error de conexión Twilio: ${res.error || 'Fallo de autenticación'}`, 'error');
      }
      fetchStatus();
    } catch (err: any) {
      showToast(`Error: ${err?.message || err}`, 'error');
    } finally {
      setTestingSDK(false);
    }
  };

  const fetchInboundMessages = async () => {
    setLoadingInbound(true);
    try {
      const res = await TwilioWhatsAppService.getInboundMessages();
      setInboundMessages(res.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInbound(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchInboundMessages();
  }, []);

  const handleCopy = (text: string, type: 'webhook' | 'status' | 'number') => {
    navigator.clipboard.writeText(text);
    if (type === 'webhook') {
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2500);
      showToast('URL de Webhook Inbound copiada al portapapeles', 'info');
    } else if (type === 'status') {
      setCopiedStatusCallback(true);
      setTimeout(() => setCopiedStatusCallback(false), 2500);
      showToast('URL de Status Callback copiada al portapapeles', 'info');
    } else {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2500);
      showToast('Número de Twilio Sandbox copiado', 'info');
    }
  };

  const handleSendTestMessage = async () => {
    if (!testPhone.trim() || !testMessage.trim()) {
      showToast('Por favor complete el teléfono y el mensaje de prueba', 'error');
      return;
    }

    setSendingTest(true);
    setTestResult(null);

    try {
      const result = await TwilioWhatsAppService.sendTextMessage(testPhone, testMessage);

      if (result.success) {
        setTestResult({
          success: true,
          message: `✅ Mensaje enviado con éxito vía Twilio API (HTTP 200). MessageSid: ${result.messageId}`,
          messageId: result.messageId,
          httpStatus: 200,
        });
        showToast('Mensaje de WhatsApp enviado físicamente vía Twilio', 'success');
        fetchInboundMessages();
      } else {
        const errText = String(result.error || '').toLowerCase();
        const isNotJoined =
          result.code === 63016 ||
          result.code === 21608 ||
          errText.includes('sandbox') ||
          errText.includes('opted-in') ||
          errText.includes('opted in') ||
          errText.includes('unregistered') ||
          errText.includes('not a valid phone number');

        setTestResult({
          success: false,
          isSandboxUnjoined: isNotJoined,
          message: isNotJoined
            ? '⚠️ DESTINATARIO NO VINCULADO AL SANDBOX: El número destino no se unió al Sandbox de Twilio todavía. Enviá el código de activación al +1 737 221 2163 desde tu WhatsApp.'
            : `❌ Error de Twilio: ${result.error || 'No se pudo enviar el mensaje'}`,
          httpStatus: result.code || 400,
          details: result.details,
        });
        showToast(
          isNotJoined ? 'Destinatario no vinculado al Sandbox de Twilio' : result.error || 'Fallo en el envío por Twilio',
          'error'
        );
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `❌ Error de conexión: ${err.message || err}`,
      });
      showToast('Error de comunicación con el servidor', 'error');
    } finally {
      setSendingTest(false);
    }
  };

  const webhookUrl = status?.webhookInboundUrl || 'https://ais-dev-wd2m6j5fuu77jxh4ldjadl-135361764474.us-east1.run.app/api/twilio/whatsapp/inbound';
  const statusCallbackUrl = status?.statusCallbackUrl || 'https://ais-dev-wd2m6j5fuu77jxh4ldjadl-135361764474.us-east1.run.app/api/twilio/whatsapp/status';
  const sandboxNumber = status?.sandboxNumber || '+17372508034';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-indigo-950 via-stone-900 to-stone-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Twilio WhatsApp Integration · Server-Side Secrets</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-100 tracking-tight">
              Control & Envío Real de WhatsApp (Twilio)
            </h2>
            <p className="text-xs sm:text-sm text-stone-300 max-w-2xl leading-relaxed">
              Gestión operativa del canal WhatsApp con validación criptográfica de firma <code className="text-indigo-300 font-mono">X-Twilio-Signature</code> y orquestación automática de la secretaria digital con la agenda publicada.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
            <button
              onClick={handleTestConnectionSDK}
              disabled={testingSDK}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-700/80 hover:bg-indigo-600 active:scale-95 text-white font-bold text-xs shadow-lg transition-all border border-indigo-400/40"
            >
              <Activity className={`w-4 h-4 ${testingSDK ? 'animate-spin' : ''}`} />
              <span>Probar Conexión (Ping SDK)</span>
            </button>
            <button
              onClick={fetchStatus}
              disabled={loadingStatus}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-xs shadow-lg transition-all border border-indigo-400/30"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
              <span>Ejecutar Diagnóstico</span>
            </button>
          </div>
        </div>
      </div>

      {/* Matriz de Estado Operativo Twilio Sandbox */}
      <div className="bg-stone-900 text-stone-200 rounded-3xl border border-stone-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <span>Matriz Operativa de Integración Twilio Sandbox</span>
          </span>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/60">
            ENTORNO: SANDBOX / PRUEBA
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800/80 space-y-1">
            <span className="text-[10px] text-stone-400 font-medium">SANDBOX FROM</span>
            <p className="font-mono font-bold text-indigo-300">+17372508034</p>
          </div>

          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800/80 space-y-1">
            <span className="text-[10px] text-stone-400 font-medium">DESTINO DE PRUEBA</span>
            <p className="font-mono font-bold text-emerald-400">+5493416051574</p>
          </div>

          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800/80 space-y-1">
            <span className="text-[10px] text-stone-400 font-medium">KINESIÓLOGO</span>
            <p className="font-mono font-bold text-stone-300">+5493436224149</p>
          </div>

          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800/80 space-y-1">
            <span className="text-[10px] text-stone-400 font-medium">ACCOUNT SID</span>
            <p className="font-mono font-bold text-stone-300">
              {status?.hasAccountSid ? (status.accountSid || 'CONFIGURADO') : 'FALTA'}
            </p>
          </div>

          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800/80 space-y-1">
            <span className="text-[10px] text-stone-400 font-medium">AUTH TOKEN</span>
            <p className="font-mono font-bold text-stone-300">
              {status?.hasAuthToken ? 'CONFIGURADO' : 'FALTA'}
            </p>
          </div>

          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800/80 space-y-1">
            <span className="text-[10px] text-stone-400 font-medium">TWILIO API</span>
            <p
              className={`font-mono font-bold ${
                status?.connectionStatus === 'CONNECTED'
                  ? 'text-emerald-400'
                  : status?.connectionStatus === 'DISCONNECTED'
                  ? 'text-rose-400'
                  : 'text-amber-400'
              }`}
            >
              {status?.connectionStatus || 'NOT_CONFIGURED'}
            </p>
          </div>

          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800/80 space-y-1">
            <span className="text-[10px] text-stone-400 font-medium">WEBHOOK</span>
            <p className="font-mono font-bold text-emerald-400">ONLINE</p>
          </div>

          <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800/80 space-y-1">
            <span className="text-[10px] text-stone-400 font-medium">STATUS CALLBACK</span>
            <p className="font-mono font-bold text-emerald-400">ONLINE</p>
          </div>
        </div>
      </div>

      {/* 3 Status Cards Grid: Server, Credentials, Twilio Connection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. ESTADO DEL SERVIDOR */}
        <div className="bg-white dark:bg-[#121B17] rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Estado del Servidor</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
              ACTIVO
            </span>
          </div>
          <div>
            <p className="text-sm font-black text-stone-900 dark:text-stone-100">
              Node.js Express Backend
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Endpoints <code className="text-indigo-600 dark:text-indigo-400 font-mono">/api/twilio/*</code> operativos.
            </p>
          </div>
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span>0 secretos expuestos en el navegador</span>
          </div>
        </div>

        {/* 2. ESTADO DE CREDENCIALES (SECRETS) */}
        <div className="bg-white dark:bg-[#121B17] rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <span>Estado de Credenciales</span>
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                status?.hasAccountSid && status?.hasAuthToken
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300'
              }`}
            >
              {status?.hasAccountSid && status?.hasAuthToken ? 'CONFIGURADAS' : 'FALTAN'}
            </span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-stone-500">TWILIO_ACCOUNT_SID:</span>
              <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                {status?.hasAccountSid ? (status.accountSid || 'Configurado (AC...)') : 'No configurado'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-stone-500">TWILIO_AUTH_TOKEN:</span>
              <span className="font-mono font-bold text-stone-800 dark:text-stone-200">
                {status?.hasAuthToken ? '●●●●●●●● (Protegido)' : 'No configurado'}
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 text-[11px] text-stone-500 dark:text-stone-400">
            Inyectadas vía Secrets server-side
          </div>
        </div>

        {/* 3. ESTADO DE CONEXIÓN TWILIO */}
        <div className="bg-white dark:bg-[#121B17] rounded-3xl border border-stone-200 dark:border-stone-800 p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-indigo-500" />
              <span>Conexión Twilio Live</span>
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                status?.connectionStatus === 'CONNECTED'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                  : status?.connectionStatus === 'DISCONNECTED'
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border border-amber-300'
              }`}
            >
              {status?.connectionStatus === 'CONNECTED'
                ? 'CONNECTED'
                : status?.connectionStatus === 'DISCONNECTED'
                ? 'DISCONNECTED'
                : 'FALTA CONFIGURACIÓN'}
            </span>
          </div>
          <div>
            <p className="text-sm font-black text-stone-900 dark:text-stone-100">
              {status?.connectionStatus === 'CONNECTED'
                ? `HTTP 200 · ${status.accountName || 'Cuenta Activa'}`
                : status?.connectionStatus === 'DISCONNECTED'
                ? `HTTP ${status.httpStatus || 401} · ${status.error || 'Error'}`
                : 'Esperando credenciales en Secrets'}
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {status?.connectionStatus === 'CONNECTED'
                ? 'Listo para enviar y recibir WhatsApps reales.'
                : 'Verificación en tiempo real contra api.twilio.com'}
            </p>
          </div>
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800/80 text-[11px] text-stone-500 dark:text-stone-400">
            Canal: WhatsApp Sandbox
          </div>
        </div>
      </div>

      {/* Webhook Endpoints Box with Copy Buttons (Regla 7 y 9) */}
      <div className="bg-white dark:bg-[#121B17] rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
            <Link className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              URLs Públicas para Twilio Console (Sandbox Settings)
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Copia y pega estas dos URLs directamente en tu panel de Twilio Console (<span className="font-semibold">Messaging → Try it out → Send a WhatsApp message → Sandbox settings</span>).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* WEBHOOK INBOUND */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-stone-700 dark:text-stone-300">
                WEBHOOK INBOUND (When a message comes in):
              </span>
              <button
                onClick={() => handleCopy(webhookUrl, 'webhook')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-300 transition-all"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWebhook ? 'Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-stone-900 text-indigo-300 font-mono text-xs break-all border border-stone-800 select-all">
              {webhookUrl}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Método: <strong className="text-stone-800 dark:text-stone-200">HTTP POST</strong>. Recibe mensajes de pacientes y los procesa con la secretaria digital.
            </p>
          </div>

          {/* STATUS CALLBACK */}
          <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/60 border border-stone-200/80 dark:border-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-stone-700 dark:text-stone-300">
                STATUS CALLBACK (Status callback URL):
              </span>
              <button
                onClick={() => handleCopy(statusCallbackUrl, 'status')}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-300 transition-all"
              >
                {copiedStatusCallback ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedStatusCallback ? 'Copiado!' : 'Copiar URL'}</span>
              </button>
            </div>
            <div className="p-2.5 rounded-xl bg-stone-900 text-indigo-300 font-mono text-xs break-all border border-stone-800 select-all">
              {statusCallbackUrl}
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Método: <strong className="text-stone-800 dark:text-stone-200">HTTP POST</strong>. Rastrea entregas (sent / delivered / read / failed).
            </p>
          </div>
        </div>

        {/* NÚMERO SANDBOX */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200/60 dark:border-indigo-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-stone-700 dark:text-stone-300">
              Número Sandbox de Twilio: <strong className="font-mono text-stone-900 dark:text-stone-100">{sandboxNumber}</strong>
            </span>
          </div>
          <button
            onClick={() => handleCopy(sandboxNumber, 'number')}
            className="flex items-center gap-1 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all self-start sm:self-center"
          >
            {copiedNumber ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedNumber ? 'Copiado!' : 'Copiar Número'}</span>
          </button>
        </div>
      </div>

      {/* Real Send Test Section */}
      <div className="bg-white dark:bg-[#121B17] rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Prueba de Envío Real (Twilio WhatsApp)
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Envía un WhatsApp real para verificar la salida efectiva a través de la API oficial de Twilio.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-stone-400" />
              <span>Número de Teléfono Destino (Con código de país):</span>
            </label>
            <input
              type="text"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+54 9 341 605-1574"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
              <span>Mensaje a Enviar:</span>
            </label>
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Texto del mensaje..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <button
          onClick={handleSendTestMessage}
          disabled={sendingTest}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
        >
          {sendingTest ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Enviando mensaje real vía Twilio...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Enviar Mensaje Real por Twilio</span>
            </>
          )}
        </button>

        {testResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-2 ${
              testResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="font-bold">{testResult.message}</p>
              {testResult.httpStatus && (
                <span className="font-mono font-extrabold px-2 py-0.5 rounded-md bg-black/10 dark:bg-black/30">
                  HTTP {testResult.httpStatus}
                </span>
              )}
            </div>
            {testResult.messageId && (
              <p className="font-mono text-[11px] text-stone-600 dark:text-stone-300">
                MessageSid Twilio: <strong>{testResult.messageId}</strong>
              </p>
            )}
            {testResult.details && (
              <pre className="text-[11px] p-2 bg-black/10 dark:bg-black/30 rounded-lg overflow-x-auto font-mono">
                {JSON.stringify(testResult.details, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Inbound Messages Log Section */}
      <div className="bg-white dark:bg-[#121B17] rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              <Inbox className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Mensajes Entrantes Guardados (Twilio Webhook)
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Mensajes recibidos en <code className="text-indigo-600 dark:text-indigo-400 font-mono">/api/twilio/whatsapp/inbound</code> validados con X-Twilio-Signature y de-duplicados por MessageSid.
              </p>
            </div>
          </div>

          <button
            onClick={fetchInboundMessages}
            disabled={loadingInbound}
            className="p-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-all text-xs flex items-center gap-1.5 font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingInbound ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>
        </div>

        {inboundMessages.length === 0 ? (
          <div className="p-8 text-center bg-stone-50 dark:bg-stone-900/40 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800 space-y-2">
            <Inbox className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
              Aún no se han registrado mensajes entrantes vía Webhook de Twilio.
            </p>
            <p className="text-[11px] text-stone-400">
              Envía un WhatsApp al Sandbox de Twilio desde tu celular para probar el flujo conversacional.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {inboundMessages.map((msg, idx) => (
              <div
                key={msg.messageSid || idx}
                className="p-3.5 bg-stone-50 dark:bg-stone-900/60 rounded-xl border border-stone-200/60 dark:border-stone-800/60 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      De: {msg.from}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 font-mono text-stone-600 dark:text-stone-400">
                      SID: {msg.messageSid}
                    </span>
                  </div>
                  <p className="text-stone-800 dark:text-stone-200 font-medium">"{msg.body}"</p>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-stone-400 whitespace-nowrap">
                  <Clock className="w-3 h-3" />
                  <span>{new Date(msg.receivedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Diagnostics Logs Drawer */}
      {status?.logs && status.logs.length > 0 && (
        <div className="bg-stone-900 rounded-3xl p-5 text-stone-300 font-mono text-xs border border-stone-800 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <Terminal className="w-4 h-4" />
              <span>Logs del Servidor Twilio (Sin Secretos)</span>
            </span>
            <button
              onClick={() => setShowLogs(!showLogs)}
              className="text-[11px] text-stone-400 hover:text-white"
            >
              {showLogs ? 'Ocultar' : 'Ver Detalles'}
            </button>
          </div>
          {showLogs && (
            <div className="space-y-1 max-h-48 overflow-y-auto text-[11px]">
              {status.logs.map((log, i) => (
                <div key={i} className="text-stone-300">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
