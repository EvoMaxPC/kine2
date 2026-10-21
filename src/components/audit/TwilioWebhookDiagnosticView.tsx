import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Filter,
  Search,
  Terminal,
  ChevronDown,
  ChevronRight,
  Lock,
  Trash2,
  ArrowDownLeft,
  ArrowUpRight,
  MessageSquare,
  Activity,
  Globe,
} from 'lucide-react';
import { TwilioWebhookLogEntry } from '../../types/twilioWebhookLog.ts';

export const TwilioWebhookDiagnosticView: React.FC = () => {
  const [logs, setLogs] = useState<TwilioWebhookLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [endpointFilter, setEndpointFilter] = useState<'all' | '/api/twilio/whatsapp/inbound' | '/api/twilio/whatsapp/status'>('all');
  const [signatureFilter, setSignatureFilter] = useState<'all' | 'VALID' | 'INVALID' | 'SKIPPED_NO_TOKEN'>('all');
  const [expandedPayloadIds, setExpandedPayloadIds] = useState<Set<string>>(new Set());
  const [expandedHeadersIds, setExpandedHeadersIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/twilio/whatsapp/webhook-logs?limit=50');
      if (res.ok) {
        const data = await res.json();
        if (data.logs) {
          setLogs(data.logs);
          setLastUpdated(new Date());
        }
      }
    } catch (err) {
      console.error('Error al cargar logs de webhooks Twilio:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 4000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchLogs]);

  const handleClearLogs = async () => {
    if (!window.confirm('¿Deseas vaciar el registro en memoria de webhooks de Twilio?')) return;
    try {
      const res = await fetch('/api/twilio/whatsapp/webhook-logs', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error al vaciar logs de Twilio:', err);
    }
  };

  const togglePayload = (id: string) => {
    setExpandedPayloadIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleHeaders = (id: string) => {
    setExpandedHeadersIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyJson = (id: string, payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtrado de logs
  const filteredLogs = logs.filter((entry) => {
    if (endpointFilter !== 'all' && entry.endpoint !== endpointFilter) return false;
    if (signatureFilter !== 'all' && entry.signature.validationStatus !== signatureFilter) return false;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchSid = entry.messageSid?.toLowerCase().includes(term);
      const matchFrom = entry.from?.toLowerCase().includes(term);
      const matchTo = entry.to?.toLowerCase().includes(term);
      const matchBody = entry.body?.toLowerCase().includes(term);
      const matchResult = entry.processingResult?.toLowerCase().includes(term);
      const matchPayload = JSON.stringify(entry.rawPayload).toLowerCase().includes(term);
      return matchSid || matchFrom || matchTo || matchBody || matchResult || matchPayload;
    }

    return true;
  });

  const totalInbound = logs.filter((l) => l.endpoint === '/api/twilio/whatsapp/inbound').length;
  const totalStatus = logs.filter((l) => l.endpoint === '/api/twilio/whatsapp/status').length;
  const totalValidSigs = logs.filter((l) => l.signature.validationStatus === 'VALID').length;
  const totalInvalidSigs = logs.filter((l) => l.signature.validationStatus === 'INVALID').length;

  return (
    <div className="space-y-6">
      {/* Resumen Superior & Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#131B18] border border-stone-200/80 dark:border-stone-800/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-semibold mb-1">
            <span>Total Webhooks</span>
            <Activity className="w-3.5 h-3.5 text-stone-400" />
          </div>
          <div className="text-2xl font-black text-stone-900 dark:text-white tabular-nums">
            {logs.length}
          </div>
          <div className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
            Últimos registros en memoria
          </div>
        </div>

        <div className="bg-white dark:bg-[#131B18] border border-stone-200/80 dark:border-stone-800/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-semibold mb-1">
            <span>Inbound (/inbound)</span>
            <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tabular-nums">
            {totalInbound}
          </div>
          <div className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
            Mensajes entrantes recibidos
          </div>
        </div>

        <div className="bg-white dark:bg-[#131B18] border border-stone-200/80 dark:border-stone-800/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-semibold mb-1">
            <span>Status Callback</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {totalStatus}
          </div>
          <div className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
            Reportes de entrega
          </div>
        </div>

        <div className="bg-white dark:bg-[#131B18] border border-stone-200/80 dark:border-stone-800/80 rounded-2xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 font-semibold mb-1">
            <span>X-Twilio-Signature</span>
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
              {totalValidSigs}
            </span>
            <span className="text-xs font-semibold text-stone-400">válidas</span>
            {totalInvalidSigs > 0 && (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-md">
                {totalInvalidSigs} inv.
              </span>
            )}
          </div>
          <div className="text-[11px] text-stone-400 dark:text-stone-500 mt-0.5">
            HMAC-SHA1 criptográfico
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Búsqueda y Acciones */}
      <div className="bg-white dark:bg-[#131B18] border border-stone-200/80 dark:border-stone-800/80 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Filtro Endpoint */}
            <div className="p-1 bg-stone-100 dark:bg-[#18231F] rounded-xl flex items-center text-xs border border-stone-200/40 dark:border-stone-800/60">
              <button
                onClick={() => setEndpointFilter('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  endpointFilter === 'all'
                    ? 'bg-white dark:bg-[#0D5C52] text-stone-900 dark:text-white shadow-2xs font-bold'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                Todos los Endpoints
              </button>
              <button
                onClick={() => setEndpointFilter('/api/twilio/whatsapp/inbound')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  endpointFilter === '/api/twilio/whatsapp/inbound'
                    ? 'bg-white dark:bg-[#0D5C52] text-blue-700 dark:text-white shadow-2xs font-bold'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                <ArrowDownLeft className="w-3 h-3" />
                <span>/inbound ({totalInbound})</span>
              </button>
              <button
                onClick={() => setEndpointFilter('/api/twilio/whatsapp/status')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  endpointFilter === '/api/twilio/whatsapp/status'
                    ? 'bg-white dark:bg-[#0D5C52] text-emerald-700 dark:text-white shadow-2xs font-bold'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                <ArrowUpRight className="w-3 h-3" />
                <span>/status ({totalStatus})</span>
              </button>
            </div>

            {/* Filtro Firma */}
            <div className="p-1 bg-stone-100 dark:bg-[#18231F] rounded-xl flex items-center text-xs border border-stone-200/40 dark:border-stone-800/60">
              <button
                onClick={() => setSignatureFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  signatureFilter === 'all'
                    ? 'bg-white dark:bg-[#0D5C52] text-stone-900 dark:text-white shadow-2xs font-bold'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                Todas las Firmas
              </button>
              <button
                onClick={() => setSignatureFilter('VALID')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-emerald-700 dark:text-emerald-400 ${
                  signatureFilter === 'VALID'
                    ? 'bg-white dark:bg-[#0D5C52] shadow-2xs font-bold'
                    : 'text-stone-500'
                }`}
              >
                Válidas
              </button>
              <button
                onClick={() => setSignatureFilter('INVALID')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all text-rose-600 dark:text-rose-400 ${
                  signatureFilter === 'INVALID'
                    ? 'bg-white dark:bg-[#0D5C52] shadow-2xs font-bold'
                    : 'text-stone-500'
                }`}
              >
                Inválidas
              </button>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                autoRefresh
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-stone-50 text-stone-600 border-stone-200 dark:bg-stone-800/50 dark:text-stone-400 dark:border-stone-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
              <span>Auto-refresco (4s)</span>
            </button>

            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>

            {logs.length > 0 && (
              <button
                onClick={handleClearLogs}
                title="Limpiar registro de logs"
                className="p-1.5 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-stone-200 dark:border-stone-800 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por MessageSid, teléfono (+549...), texto del mensaje o contenido del payload..."
            className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-[#0E1513] border border-stone-200 dark:border-stone-800 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 focus:outline-none focus:border-teal-700 dark:focus:border-teal-500 transition-colors"
          />
        </div>

        {lastUpdated && (
          <div className="text-[11px] text-stone-400 flex items-center justify-between">
            <span>Mostrando {filteredLogs.length} de {logs.length} eventos</span>
            <span>Última comprobación: {lastUpdated.toLocaleTimeString('es-AR')}</span>
          </div>
        )}
      </div>

      {/* Lista de Registros */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white dark:bg-[#131B18] border border-stone-200/80 dark:border-stone-800/80 rounded-3xl p-8 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 flex items-center justify-center mx-auto border border-teal-200/60 dark:border-teal-800/50">
            <Globe className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-stone-900 dark:text-white">
              No hay eventos de webhook registrados todavía
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              Cuando Twilio contacte tu servidor en <code className="font-mono text-[11px] bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">/api/twilio/whatsapp/inbound</code> o <code className="font-mono text-[11px] bg-stone-100 dark:bg-stone-800 px-1 py-0.5 rounded">/api/twilio/whatsapp/status</code>, cada petición se registrará aquí inmediatamente junto con el estado de validación de su firma y su payload completo sanitizado.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={fetchLogs}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Verificar nuevamente</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLogs.map((entry) => {
            const isPayloadOpen = expandedPayloadIds.has(entry.id);
            const isHeadersOpen = expandedHeadersIds.has(entry.id);
            const isCopied = copiedId === entry.id;

            const isInbound = entry.endpoint === '/api/twilio/whatsapp/inbound';
            const isSignatureValid = entry.signature.validationStatus === 'VALID';
            const isSignatureInvalid = entry.signature.validationStatus === 'INVALID';
            const isOkStatus = entry.httpStatus >= 200 && entry.httpStatus < 300;

            const date = new Date(entry.timestamp);
            const timeStr = date.toLocaleTimeString('es-AR', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const dateStr = date.toLocaleDateString('es-AR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            });

            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-[#131B18] border border-stone-200/80 dark:border-stone-800/80 rounded-2xl p-5 shadow-2xs space-y-4 transition-all hover:border-stone-300 dark:hover:border-stone-700"
              >
                {/* Cabecera del Evento */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Endpoint pill */}
                    <span
                      className={`font-mono text-xs font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${
                        isInbound
                          ? 'bg-blue-50 text-blue-700 border border-blue-200/70 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/50'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/50'
                      }`}
                    >
                      {isInbound ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                      <span>{entry.endpoint}</span>
                    </span>

                    {/* HTTP Status badge */}
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded-md ${
                        isOkStatus
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                      }`}
                    >
                      HTTP {entry.httpStatus}
                    </span>

                    {/* Método */}
                    <span className="font-mono text-[10px] font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded">
                      {entry.method}
                    </span>
                  </div>

                  <div className="font-mono text-stone-400 text-xs tabular-nums self-start sm:self-center">
                    {dateStr} · {timeStr}
                  </div>
                </div>

                {/* X-Twilio-Signature Status Section */}
                <div
                  className={`rounded-xl p-3.5 border ${
                    isSignatureValid
                      ? 'bg-emerald-50/70 border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-900/50'
                      : isSignatureInvalid
                      ? 'bg-rose-50/70 border-rose-200/80 dark:bg-rose-950/30 dark:border-rose-900/50'
                      : 'bg-amber-50/70 border-amber-200/80 dark:bg-amber-950/30 dark:border-amber-900/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isSignatureValid && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      {isSignatureInvalid && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                      {!isSignatureValid && !isSignatureInvalid && (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <div>
                        <span
                          className={`text-xs font-bold ${
                            isSignatureValid
                              ? 'text-emerald-900 dark:text-emerald-300'
                              : isSignatureInvalid
                              ? 'text-rose-900 dark:text-rose-300'
                              : 'text-amber-900 dark:text-amber-300'
                          }`}
                        >
                          X-Twilio-Signature:{' '}
                          {isSignatureValid
                            ? 'VÁLIDA (Verificación HMAC-SHA1 exitosa)'
                            : isSignatureInvalid
                            ? 'INVÁLIDA (Firma no coincide con URL / Payload)'
                            : 'OMITIDA (TWILIO_AUTH_TOKEN no configurado)'}
                        </span>
                        {entry.signature.header && (
                          <div className="font-mono text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                            Header recibido: <code className="bg-white/60 dark:bg-black/30 px-1 py-0.5 rounded">{entry.signature.header}</code>
                          </div>
                        )}
                      </div>
                    </div>

                    {entry.signature.matchedUrl && (
                      <div className="text-[11px] font-mono text-emerald-800 dark:text-emerald-300 bg-white/70 dark:bg-black/40 px-2 py-1 rounded-md border border-emerald-300/60 dark:border-emerald-800/60 self-start sm:self-center">
                        ✓ URL Validada: {entry.signature.matchedUrl}
                      </div>
                    )}
                  </div>

                  {/* Candidate URLs si fue inválida */}
                  {isSignatureInvalid && entry.signature.candidateUrls?.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-rose-200/60 dark:border-rose-900/40 text-[11px] space-y-1">
                      <span className="font-semibold text-rose-900 dark:text-rose-300">
                        URLs candidatas comprobadas:
                      </span>
                      <div className="space-y-0.5 font-mono text-stone-600 dark:text-stone-300 pl-2">
                        {entry.signature.candidateUrls.map((u, idx) => (
                          <div key={idx}>• {u}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Detalles del Mensaje o Callback */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1 bg-stone-50 dark:bg-[#18231F] p-3 rounded-xl border border-stone-200/60 dark:border-stone-800/60">
                    <div className="text-stone-400 text-[11px] font-semibold uppercase tracking-wider">
                      Datos de Envío Twilio
                    </div>
                    {entry.from && (
                      <div>
                        <span className="text-stone-500">De (Remitente):</span>{' '}
                        <span className="font-mono font-bold text-stone-900 dark:text-white">
                          {entry.from}
                        </span>
                      </div>
                    )}
                    {entry.to && (
                      <div>
                        <span className="text-stone-500">Para (Destino):</span>{' '}
                        <span className="font-mono font-bold text-stone-900 dark:text-white">
                          {entry.to}
                        </span>
                      </div>
                    )}
                    {entry.messageSid && (
                      <div>
                        <span className="text-stone-500">MessageSid:</span>{' '}
                        <span className="font-mono text-teal-800 dark:text-teal-300 font-bold">
                          {entry.messageSid}
                        </span>
                      </div>
                    )}
                    {entry.messageStatus && (
                      <div>
                        <span className="text-stone-500">MessageStatus:</span>{' '}
                        <span className="font-mono uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.5 rounded">
                          {entry.messageStatus}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1 bg-stone-50 dark:bg-[#18231F] p-3 rounded-xl border border-stone-200/60 dark:border-stone-800/60 flex flex-col justify-between">
                    <div>
                      <div className="text-stone-400 text-[11px] font-semibold uppercase tracking-wider">
                        Resultado del Procesamiento
                      </div>
                      <p className="text-stone-800 dark:text-stone-200 mt-1 font-medium leading-relaxed">
                        {entry.processingResult || 'Petición registrada.'}
                      </p>
                      {entry.error && (
                        <p className="text-rose-600 dark:text-rose-400 text-xs font-semibold mt-1">
                          Error: {entry.error}
                        </p>
                      )}
                    </div>

                    {entry.body && (
                      <div className="mt-2 pt-2 border-t border-stone-200/60 dark:border-stone-800/60">
                        <div className="text-[10px] text-stone-400 uppercase font-semibold">Texto Recibido:</div>
                        <div className="font-sans italic text-stone-700 dark:text-stone-300 bg-white/70 dark:bg-black/30 p-2 rounded-lg mt-0.5 border border-stone-200/40 dark:border-stone-800/40">
                          "{entry.body}"
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acordeones para Payload Crudo Sanitizado y Headers */}
                <div className="space-y-2 pt-1">
                  {/* Toggle Payload Crudo */}
                  <div className="border border-stone-200/70 dark:border-stone-800/70 rounded-xl overflow-hidden">
                    <button
                      onClick={() => togglePayload(entry.id)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 hover:bg-stone-100/70 dark:bg-[#16211E] dark:hover:bg-[#1A2724] text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Terminal className="w-3.5 h-3.5 text-stone-400" />
                        <span>Payload Crudo Entrante (Sanitizado de Auth Tokens)</span>
                        <span className="font-mono text-[10px] text-stone-400">
                          ({Object.keys(entry.rawPayload || {}).length} campos)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[11px] text-stone-400">
                          <Lock className="w-3 h-3 text-teal-600" />
                          <span>Tokens Protegidos</span>
                        </div>
                        {isPayloadOpen ? (
                          <ChevronDown className="w-4 h-4 text-stone-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-stone-400" />
                        )}
                      </div>
                    </button>

                    {isPayloadOpen && (
                      <div className="p-3 bg-stone-900 text-stone-100 text-xs font-mono relative overflow-x-auto">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800 text-[11px] text-stone-400">
                          <span className="flex items-center gap-1.5">
                            <Lock className="w-3 h-3 text-emerald-400" />
                            <span>Payload verificado · Sin exposición de claves secretas</span>
                          </span>
                          <button
                            onClick={() => handleCopyJson(entry.id, entry.rawPayload)}
                            className="px-2 py-0.5 bg-stone-800 hover:bg-stone-700 rounded text-stone-300 flex items-center gap-1 text-[11px] transition-colors"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{isCopied ? 'Copiado!' : 'Copiar JSON'}</span>
                          </button>
                        </div>
                        <pre className="text-[11px] leading-relaxed text-teal-200">
                          {JSON.stringify(entry.rawPayload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Toggle Headers HTTP */}
                  <div className="border border-stone-200/70 dark:border-stone-800/70 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleHeaders(entry.id)}
                      className="w-full px-3.5 py-2.5 bg-stone-50 hover:bg-stone-100/70 dark:bg-[#16211E] dark:hover:bg-[#1A2724] text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-stone-400" />
                        <span>Headers HTTP de la Petición</span>
                        <span className="font-mono text-[10px] text-stone-400">
                          (Host, X-Forwarded-Host, Proto...)
                        </span>
                      </div>
                      {isHeadersOpen ? (
                        <ChevronDown className="w-4 h-4 text-stone-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-stone-400" />
                      )}
                    </button>

                    {isHeadersOpen && (
                      <div className="p-3 bg-stone-900 text-stone-100 text-xs font-mono overflow-x-auto">
                        <pre className="text-[11px] leading-relaxed text-amber-200">
                          {JSON.stringify(entry.headers, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
