import React, { useState } from 'react';
import { ShieldCheck, Info, X } from 'lucide-react';

export const DemoBadge: React.FC = () => {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowInfo(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-teal-50 text-teal-900 border border-teal-300/70 hover:bg-teal-100 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/60 dark:hover:bg-teal-950/80 transition-colors shadow-2xs"
        title="Ver detalles del entorno operacional"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
        <span className="tracking-wide uppercase">SISTEMA ACTIVO</span>
      </button>

      {showInfo && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#141C19] border border-stone-200 dark:border-stone-800 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-stone-800 dark:text-stone-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center border border-teal-200/60 dark:border-teal-800/50">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-stone-900 dark:text-white">KineTurnos · Operational Pro</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Entorno Operacional Persistente y Validado</p>
                </div>
              </div>
              <button
                onClick={() => setShowInfo(false)}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50 dark:bg-[#0E1513] p-4 rounded-2xl border border-stone-200/60 dark:border-stone-800">
              <p>
                <strong>• Persistencia Local Real:</strong> En modo persistente todos los cambios se resguardan de forma segura al recargar la página. Se puede restablecer desde Configuración con 1 click.
              </p>
              <p>
                <strong>• Sala de Espera Digital:</strong> Registro de llegada, cálculo de tiempo de espera y flujo operativo Llegó → Iniciar Sesión → Finalizar.
              </p>
              <p>
                <strong>• Series de Turnos:</strong> Motor de recurrencia que detecta conflictos de antemano y permite reservar los espacios disponibles.
              </p>
              <p>
                <strong>• Lista de Espera con Matching:</strong> Detecta turnos liberados y genera propuestas inmediatas por WhatsApp.
              </p>
              <p>
                <strong>• Sin Datos Clínicos Inventados:</strong> Padrón puramente administrativo para proteger la privacidad del paciente.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowInfo(false)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 dark:bg-teal-700 dark:hover:bg-teal-600 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
