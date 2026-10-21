import React, { Component, ErrorInfo, ReactNode } from 'react';
import { repositoryContainer } from '../repositories/RepositoryContainer.ts';
import { Activity, AlertTriangle, RotateCcw, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `ERR_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('KineTurnos GlobalErrorBoundary caught an unhandled runtime error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleRecoverDemo = () => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // Create recovery backup before clearing
        const raw = window.localStorage.getItem('kineturnos_demo_persistent_v3') || 
                    window.localStorage.getItem('kineturnos_demo_persistent_v4');
        if (raw) {
          window.localStorage.setItem('kineturnos_demo_recovery_backup', raw);
        }
      }
      repositoryContainer.resetDemoData();
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (e) {
      console.error('Error during demo recovery:', e);
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
        window.location.reload();
      }
    }
  };

  render() {
    if (this.state.hasError) {
      const isDemoMode = repositoryContainer.getDataMode() !== 'FIREBASE';

      return (
        <div className="min-h-screen bg-[#F8FAF9] text-[#1C2421] flex items-center justify-center p-4 font-sans selection:bg-teal-100">
          <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Header / Brand */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-200/60 flex items-center justify-center text-teal-800">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-stone-900 block">
                  KineTurnos
                </span>
                <span className="text-2xs text-stone-500 font-medium">
                  Sistema de Gestión Operativa
                </span>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>KineTurnos encontró un problema al iniciar</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                La aplicación detectó un estado inconsistente en runtime. Podés reintentar la carga o restaurar los datos seguros de prueba.
              </p>
              {this.state.errorId && (
                <div className="pt-2 text-[10px] font-mono text-amber-700/80">
                  ID de diagnóstico: <span className="font-bold">{this.state.errorId}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={this.handleReload}
                className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reintentar</span>
              </button>

              {isDemoMode && (
                <button
                  onClick={this.handleRecoverDemo}
                  className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-semibold transition-all border border-stone-200 flex items-center justify-center gap-2 active:scale-98 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-stone-500" />
                  <span>Restablecer Datos Iniciales</span>
                </button>
              )}
            </div>

            <div className="text-center">
              <span className="text-[11px] text-stone-400">
                Tus datos locales previos se preservarán en backup seguro antes de reiniciar.
              </span>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
