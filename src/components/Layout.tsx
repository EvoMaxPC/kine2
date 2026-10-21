import React, { useState } from 'react';
import { useKineStore, ActiveNavTab } from '../hooks/useKineStore.ts';
import { WhatsAppTestingDrawer } from './shared/WhatsAppTestingDrawer.tsx';
import { GlobalSearchModal } from './shared/GlobalSearchModal.tsx';
import { ResetConfirmModal } from './shared/ResetConfirmModal.tsx';
import { NewAppointmentModal } from './appointments/NewAppointmentModal.tsx';
import { BlockSlotModal } from './appointments/BlockSlotModal.tsx';
import { WaitlistModal } from './waitlist/WaitlistModal.tsx';
import { SeriesAppointmentModal } from './appointments/SeriesAppointmentModal.tsx';
import { KinesiologistAlertModal } from './shared/KinesiologistAlertModal.tsx';
import {
  Clock,
  Calendar,
  Inbox,
  Users,
  ShieldCheck,
  Activity,
  CheckCircle2,
  AlertCircle,
  Info,
  MessageCircle,
  Moon,
  Sun,
  Search,
  Plus,
  Settings,
  Database,
  RotateCcw,
  ListOrdered,
  Repeat,
  Lock,
  Cpu,
  UserPlus,
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export const Layout: React.FC<Props> = ({ children }) => {
  const {
    activeTab,
    setActiveTab,
    todayOverview,
    pendingDecisionsCount,
    toastMessage,
    isWhatsAppDrawerOpen,
    setIsWhatsAppDrawerOpen,
    theme,
    toggleTheme,
    config,
    dataMode,
    isGlobalSearchOpen,
    setIsGlobalSearchOpen,
    isNewAppointmentModalOpen,
    setIsNewAppointmentModalOpen,
    newAppointmentInitialSlot,
    isNewPatientModalOpen,
    setIsNewPatientModalOpen,
    isBlockSlotModalOpen,
    setIsBlockSlotModalOpen,
    blockSlotInitialData,
    isWaitlistModalOpen,
    setIsWaitlistModalOpen,
    isSeriesModalOpen,
    setIsSeriesModalOpen,
    isResetConfirmModalOpen,
    setIsResetConfirmModalOpen,
    activeKineAlert,
    setActiveKineAlert,
    confirmAlertRequest,
    rejectRequest,
  } = useKineStore();

  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);

  const pendingCount = todayOverview?.pendingRequestsCount || 0;
  const waitingCount = todayOverview?.waitingRoomCount || 0;

  // Pantallas Principales: HOY, AGENDA, SOLICITUDES, PACIENTES (Configuración y soporte como secundarias)
  const navItems: {
    id: ActiveNavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    { id: 'hoy', label: 'Hoy', icon: Clock, badge: waitingCount > 0 ? waitingCount : undefined },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'solicitudes', label: 'Solicitudes', icon: Inbox, badge: pendingCount > 0 ? pendingCount : undefined },
    { id: 'pacientes', label: 'Pacientes', icon: Users },
    {
      id: 'decisiones',
      label: 'Decisiones',
      icon: Inbox,
      badge: pendingDecisionsCount > 0 ? pendingDecisionsCount : undefined,
    },
    { id: 'espera', label: 'Lista de Espera', icon: ListOrdered },
    { id: 'auditoria', label: 'Auditoría', icon: ShieldCheck },
    { id: 'configuracion', label: 'Configuración', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAF8] dark:bg-[#0B100E] text-[#16201D] dark:text-[#E8F0EC] flex flex-col font-sans pb-20 md:pb-6 selection:bg-teal-100 selection:text-teal-900 dark:selection:bg-teal-900/60 dark:selection:text-teal-200 transition-colors duration-200">
      {/* Top Bar with Apple/Wellness clean elegance */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#0F1714]/90 backdrop-blur-md border-b border-stone-200/80 dark:border-stone-800/80 shadow-[0_1px_6px_-2px_rgba(0,0,0,0.03)] dark:shadow-none transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          {/* Brand Wordmark & Clinic Identifier */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setActiveTab('hoy')}
              className="flex items-center gap-3 text-left focus:outline-hidden"
            >
              <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 flex items-center justify-center text-teal-800 dark:text-teal-300 shadow-2xs">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight text-stone-900 dark:text-white leading-tight">
                    KineTurnos
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                    PRO
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 dark:text-stone-400 font-medium hidden sm:block truncate max-w-[200px]">
                  {config.clinicName}
                </div>
              </div>
            </button>
          </div>

          {/* Center: Global Search Bar + Nav Items */}
          <div className="hidden lg:flex items-center gap-3 flex-1 max-w-xl mx-4">
            <button
              onClick={() => setIsGlobalSearchOpen(true)}
              className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-stone-100/80 dark:bg-[#15221C] border border-stone-200/60 dark:border-stone-800 text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 hover:border-teal-400/50 transition-all shadow-2xs"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                <span>Buscar pacientes, turnos, teléfonos...</span>
              </div>
              <kbd className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-stone-200/70 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Actions: Quick Action (+), Dark Mode, Simulator, DataMode */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Search Trigger for Mobile/Tablet */}
            <button
              onClick={() => setIsGlobalSearchOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-stone-200/70 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
              title="Buscar (Ctrl+K)"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Quick Action (+) Button Dropdown (Regla 24) */}
            <div className="relative">
              <button
                onClick={() => setIsQuickActionsOpen((prev) => !prev)}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs active:scale-95"
                title="Acciones rápidas"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Acción Rápida</span>
              </button>

              {isQuickActionsOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsQuickActionsOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#141E1A] rounded-2xl shadow-xl border border-stone-200 dark:border-stone-800 p-1.5 z-50 animate-in fade-in zoom-in-95">
                    <button
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setIsNewAppointmentModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-xl transition-colors text-left"
                    >
                      <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                      <span>Nuevo turno</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setIsSeriesModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-xl transition-colors text-left"
                    >
                      <Repeat className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>Serie recurrente</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setActiveTab('pacientes');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-xl transition-colors text-left"
                    >
                      <UserPlus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span>Nuevo paciente</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setIsBlockSlotModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-xl transition-colors text-left"
                    >
                      <Lock className="w-4 h-4 text-stone-500" />
                      <span>Bloquear horario</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setIsWaitlistModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-stone-700 dark:text-stone-200 hover:bg-teal-50 dark:hover:bg-teal-950/60 rounded-xl transition-colors text-left"
                    >
                      <ListOrdered className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Agregar a lista de espera</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Decision Center Quick Alert Button */}
            {pendingDecisionsCount > 0 && (
              <button
                onClick={() => setActiveTab('decisiones')}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                title={`${pendingDecisionsCount} decisiones pendientes`}
              >
                <Inbox className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{pendingDecisionsCount} Decisión{pendingDecisionsCount > 1 ? 'es' : ''}</span>
              </button>
            )}

            {/* Dark Mode Button with smooth toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border transition-all text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white bg-stone-100/80 dark:bg-[#151F1B] border-stone-200/70 dark:border-stone-800 hover:bg-stone-200/70 dark:hover:bg-stone-800 shadow-2xs active:scale-95 flex items-center gap-1.5 text-xs font-semibold"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Alternar modo oscuro"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200" />
              ) : (
                <Moon className="w-4 h-4 text-stone-600 animate-in spin-in-90 duration-200" />
              )}
            </button>

            {/* WhatsApp Simulator Drawer Trigger */}
            <button
              onClick={() => setIsWhatsAppDrawerOpen(true)}
              className="px-3 py-1.5 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/40 text-[#075E54] dark:text-[#25D366] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs"
              title="Abrir simulador de WhatsApp para probar interacción con pacientes"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span className="hidden xl:inline">Simulador WhatsApp</span>
            </button>

            {/* DataMode Indicator Pill */}
            <button
              onClick={() => setActiveTab('configuracion')}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[10px] font-mono font-bold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 border border-stone-200/70 dark:border-stone-700 transition-colors"
              title="Configuración de persistencia y modo de datos"
            >
              <Database className="w-3 h-3 text-teal-600" />
              <span>{dataMode}</span>
            </button>
          </div>
        </div>

        {/* Desktop Primary Nav Bar (Tabs) */}
        <div className="hidden md:block border-t border-stone-100 dark:border-stone-800/80 bg-white/60 dark:bg-[#0F1714]/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 py-1.5 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 shrink-0 ${
                    isActive
                      ? 'bg-teal-50 dark:bg-teal-950/80 text-teal-900 dark:text-teal-200 border border-teal-200/70 dark:border-teal-800/60 font-bold'
                      : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100/60 dark:hover:bg-stone-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-700 dark:text-teal-300' : 'text-stone-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full tabular-nums ${
                        isActive
                          ? 'bg-amber-400 text-stone-950'
                          : 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {children}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-8 right-4 md:right-8 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border text-xs font-semibold flex items-center gap-2.5 ${
              toastMessage.type === 'success'
                ? 'bg-[#0D5C52] text-white border-teal-800 dark:bg-teal-900 dark:border-teal-700'
                : toastMessage.type === 'error'
                ? 'bg-rose-800 text-white border-rose-900'
                : 'bg-stone-800 text-white border-stone-900'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            ) : toastMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-300 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-stone-300 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar for Mobile (< 768px) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-[#0F1714]/95 backdrop-blur-md border-t border-stone-200/90 dark:border-stone-800/90 h-16 flex items-center justify-around px-2 shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 transition-colors relative min-h-[44px] ${
                isActive ? 'text-teal-700 dark:text-teal-400' : 'text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
              {item.badge !== undefined && (
                <span className="absolute top-1 right-1/4 translate-x-2 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full tabular-nums">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Global Modals */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
      />

      <ResetConfirmModal
        isOpen={isResetConfirmModalOpen}
        onClose={() => setIsResetConfirmModalOpen(false)}
      />

      {isNewAppointmentModalOpen && (
        <NewAppointmentModal
          isOpen={isNewAppointmentModalOpen}
          initialDate={newAppointmentInitialSlot?.date}
          initialTime={newAppointmentInitialSlot?.time}
          initialProfessionalId={newAppointmentInitialSlot?.professionalId}
          onClose={() => setIsNewAppointmentModalOpen(false)}
        />
      )}

      {isBlockSlotModalOpen && (
        <BlockSlotModal
          isOpen={isBlockSlotModalOpen}
          initialData={blockSlotInitialData}
          onClose={() => setIsBlockSlotModalOpen(false)}
        />
      )}

      {isWaitlistModalOpen && (
        <WaitlistModal
          isOpen={isWaitlistModalOpen}
          onClose={() => setIsWaitlistModalOpen(false)}
        />
      )}

      {isSeriesModalOpen && (
        <SeriesAppointmentModal
          isOpen={isSeriesModalOpen}
          onClose={() => setIsSeriesModalOpen(false)}
        />
      )}

      {/* Alerta Prioritaria al Kinesiólogo con Sonido */}
      <KinesiologistAlertModal
        isOpen={Boolean(activeKineAlert)}
        request={activeKineAlert}
        consultationFee={config.consultationFee || 15000}
        clinicName={config.clinicName}
        isSlotAvailable={true}
        onConfirm={async (req) => {
          await confirmAlertRequest(req);
        }}
        onProposeAnother={(req) => {
          setActiveKineAlert(null);
          setActiveTab('solicitudes');
        }}
        onReject={(req) => {
          rejectRequest(req.id, 'Sin disponibilidad en agenda');
          setActiveKineAlert(null);
        }}
        onClose={() => setActiveKineAlert(null)}
      />

      {/* WhatsApp Interactive Testing Drawer */}
      <WhatsAppTestingDrawer
        isOpen={isWhatsAppDrawerOpen}
        onClose={() => setIsWhatsAppDrawerOpen(false)}
      />

      {/* Quiet Professional Footer */}
      <footer className="mt-auto border-t border-stone-200/80 dark:border-stone-800/80 bg-white/70 dark:bg-[#0F1714]/70 py-6 px-4 text-center text-xs text-stone-500 dark:text-stone-400 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-600 dark:bg-teal-400"></span>
            <span>{config.clinicName} · Sistema Operativo Profesional</span>
          </div>
          <div className="flex items-center gap-3 text-stone-500 dark:text-stone-400">
            <button
              onClick={() => setActiveTab('auditoria')}
              className={`hover:text-stone-900 dark:hover:text-white transition-colors ${
                activeTab === 'auditoria' ? 'font-bold text-teal-800 dark:text-teal-300' : ''
              }`}
            >
              Auditoría
            </button>
            <span className="text-stone-300 dark:text-stone-700">·</span>
            <button
              onClick={() => setActiveTab('configuracion')}
              className={`hover:text-stone-900 dark:hover:text-white transition-colors ${
                activeTab === 'configuracion' ? 'font-bold text-teal-800 dark:text-teal-300' : ''
              }`}
            >
              Configuración
            </button>
            <span className="text-stone-300 dark:text-stone-700">·</span>
            <span>Modo: {dataMode}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
