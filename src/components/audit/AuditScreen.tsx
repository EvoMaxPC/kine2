import React, { useState, useEffect } from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { ShieldCheck, User, Bot, Clock, Search, Filter, Activity, Globe } from 'lucide-react';
import { TwilioWebhookDiagnosticView } from './TwilioWebhookDiagnosticView.tsx';

export const AuditScreen: React.FC = () => {
  const { auditLogs } = useKineStore();
  const [activeTab, setActiveTab] = useState<'audit' | 'twilio_webhooks'>('audit');
  const [filterActor, setFilterActor] = useState<'all' | 'AI_ASSISTANT' | 'STAFF'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [webhookLogsCount, setWebhookLogsCount] = useState<number>(0);

  useEffect(() => {
    fetch('/api/twilio/whatsapp/webhook-logs?limit=1')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && typeof data.total === 'number') {
          setWebhookLogsCount(data.total);
        }
      })
      .catch(() => {});
  }, [activeTab]);

  const filteredLogs = auditLogs.filter((log) => {
    if (filterActor !== 'all' && log.actorType !== filterActor) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.description.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term) ||
        (log.entityId && log.entityId.toLowerCase().includes(term))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Selector de Pestañas: Auditoría Operativa vs Diagnóstico Twilio Webhook */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-100 dark:bg-[#131B18] p-1.5 rounded-2xl border border-stone-200/80 dark:border-stone-800/80">
        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'audit'
                ? 'bg-white dark:bg-[#0D5C52] text-stone-900 dark:text-white shadow-2xs'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
            <span>Auditoría Clínica ({auditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('twilio_webhooks')}
            className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === 'twilio_webhooks'
                ? 'bg-white dark:bg-[#0D5C52] text-stone-900 dark:text-white shadow-2xs'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Diagnóstico Webhooks Twilio</span>
            {webhookLogsCount > 0 && (
              <span className="font-mono text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.2 rounded-full font-extrabold">
                {webhookLogsCount}
              </span>
            )}
          </button>
        </div>

        <div className="text-[11px] text-stone-400 dark:text-stone-500 px-2 hidden sm:block">
          {activeTab === 'audit' ? 'Eventos inmutables de agenda' : 'Supervisión en vivo de /inbound y /status'}
        </div>
      </div>

      {activeTab === 'twilio_webhooks' ? (
        <TwilioWebhookDiagnosticView />
      ) : (
        <div className="bg-white dark:bg-[#131B18] border border-stone-200/80 dark:border-stone-800/80 rounded-3xl p-6 sm:p-7 shadow-[0_2px_12px_-4px_rgba(13,92,82,0.06)] space-y-4 transition-colors duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100 dark:border-stone-800/80">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-teal-900 dark:text-teal-300 mb-1 flex items-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-700 dark:text-teal-400" />
                <span>Seguridad & Trazabilidad Inmutable</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-white">
                Registro de Auditoría ({auditLogs.length})
              </h1>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
                Registro estricto de todas las operaciones de agenda, modificaciones y validaciones automáticas.
              </p>
            </div>

            {/* Actor filter */}
            <div className="p-1 bg-stone-100 dark:bg-[#18231F] rounded-xl flex items-center text-xs self-start sm:self-center border border-stone-200/40 dark:border-stone-800/60">
              <button
                onClick={() => setFilterActor('all')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                  filterActor === 'all'
                    ? 'bg-white dark:bg-[#0D5C52] text-stone-900 dark:text-white shadow-2xs font-bold'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterActor('AI_ASSISTANT')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  filterActor === 'AI_ASSISTANT'
                    ? 'bg-white dark:bg-[#0D5C52] text-purple-900 dark:text-white shadow-2xs font-bold'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                <Bot className="w-3 h-3" />
                <span>Asistente IA</span>
              </button>
              <button
                onClick={() => setFilterActor('STAFF')}
                className={`px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1 ${
                  filterActor === 'STAFF'
                    ? 'bg-white dark:bg-[#0D5C52] text-teal-900 dark:text-white shadow-2xs font-bold'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                <User className="w-3 h-3" />
                <span>Profesional</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar por acción, motivo o paciente..."
              className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-[#0E1513] border border-stone-200 dark:border-stone-800 rounded-xl text-xs sm:text-sm text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:border-teal-700 dark:focus:border-teal-500 transition-colors"
            />
          </div>

          {/* Events List */}
          <div className="divide-y divide-stone-100 dark:divide-stone-800/80 mt-2">
            {filteredLogs.length === 0 ? (
              <div className="py-12 text-center text-stone-400 dark:text-stone-400 text-xs">
                No se encontraron eventos de auditoría registrados.
              </div>
            ) : (
              filteredLogs.map((log) => {
                const date = new Date(log.timestamp);
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

                const isAi = log.actorType === 'AI_ASSISTANT';

                return (
                  <div
                    key={log.id}
                    className="py-3 px-2 sm:px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-stone-50/70 dark:hover:bg-[#16211E]/70 rounded-xl transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isAi
                            ? 'bg-purple-50 text-purple-700 border border-purple-200/60 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/50'
                            : 'bg-teal-50 text-teal-800 border border-teal-200/60 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/50'
                        }`}
                      >
                        {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-stone-900 dark:text-white">
                            {isAi ? 'Asistente Digital WhatsApp' : 'Profesional / Recepción'}
                          </span>
                          <span className="text-stone-300 dark:text-stone-700">·</span>
                          <span className="font-mono text-[10px] font-bold text-teal-950 dark:text-teal-300 bg-stone-100 dark:bg-[#18231F] px-2 py-0.5 rounded-md border border-stone-200/70 dark:border-stone-800">
                            {log.action}
                          </span>
                        </div>
                        <p className="text-stone-600 dark:text-stone-400 leading-relaxed">{log.description}</p>
                      </div>
                    </div>

                    <div className="font-mono text-stone-400 dark:text-stone-400 text-[11px] tabular-nums shrink-0 self-end sm:self-center">
                      {dateStr} {timeStr}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

