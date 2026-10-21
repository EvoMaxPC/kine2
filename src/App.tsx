import React from 'react';
import { KineProvider } from './context/KineContext.tsx';
import { useKineStore } from './hooks/useKineStore.ts';
import { Layout } from './components/Layout.tsx';
import { TodayScreen } from './components/today/TodayScreen.tsx';
import { AgendaScreen } from './components/agenda/AgendaScreen.tsx';
import { DecisionCenterScreen } from './components/decisions/DecisionCenterScreen.tsx';
import { RequestsScreen } from './components/requests/RequestsScreen.tsx';
import { PatientsScreen } from './components/patients/PatientsScreen.tsx';
import { WaitlistScreen } from './components/waitlist/WaitlistScreen.tsx';
import { AutomationScreen } from './components/automation/AutomationScreen.tsx';
import { AuditScreen } from './components/audit/AuditScreen.tsx';
import { ConfigScreen } from './components/config/ConfigScreen.tsx';
import { RotateCcw, RefreshCw, AlertCircle } from 'lucide-react';

function MainRouter() {
  const { activeTab, loading, bootStatus, bootError, resetDemoData, refreshAll } = useKineStore();

  if (loading && bootStatus === 'BOOTING') {
    return (
      <div className="py-24 text-center">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-[#141C19] rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs text-xs font-semibold text-stone-600 dark:text-stone-300 animate-in fade-in duration-150">
          <div className="w-4 h-4 border-2 border-teal-700 dark:border-teal-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Iniciando consultorio...</span>
        </div>
      </div>
    );
  }

  if (bootStatus === 'ERROR') {
    return (
      <div className="max-w-md mx-auto my-12 bg-white dark:bg-[#141C19] p-6 rounded-3xl border border-rose-200 dark:border-rose-900/50 shadow-sm text-center space-y-4">
        <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-stone-900 dark:text-white">
            No pudimos iniciar los datos del consultorio
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {bootError || 'Ocurrió una inconsistencia al leer la persistencia local.'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <button
            onClick={() => refreshAll()}
            className="w-full sm:w-auto px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reintentar</span>
          </button>
          <button
            onClick={() => resetDemoData()}
            className="w-full sm:w-auto px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer Datos</span>
          </button>
        </div>
      </div>
    );
  }

  switch (activeTab) {
    case 'hoy':
      return <TodayScreen />;
    case 'agenda':
      return <AgendaScreen />;
    case 'decisiones':
      return <DecisionCenterScreen />;
    case 'solicitudes':
      return <RequestsScreen />;
    case 'pacientes':
      return <PatientsScreen />;
    case 'espera':
      return <WaitlistScreen />;
    case 'automatizaciones':
      return <AutomationScreen />;
    case 'auditoria':
      return <AuditScreen />;
    case 'configuracion':
      return <ConfigScreen />;
    default:
      return <TodayScreen />;
  }
}

export default function App() {
  return (
    <KineProvider>
      <Layout>
        <MainRouter />
      </Layout>
    </KineProvider>
  );
}
