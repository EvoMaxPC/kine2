import React from 'react';
import { useKineStore } from '../../hooks/useKineStore.ts';
import { AlertTriangle, RotateCcw, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetConfirmModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { resetDemoData } = useKineStore();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-[#121B17] w-full max-w-md rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 p-5 space-y-4">
        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              ¿Restablecer datos del consultorio?
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Esta acción restablecerá turnos, pacientes, solicitudes y mensajes al estado inicial del sistema.
            </p>
          </div>
        </div>

        <div className="p-3 bg-stone-50 dark:bg-[#15221C] rounded-xl border border-stone-200/60 dark:border-stone-800 text-xs text-stone-600 dark:text-stone-300">
          Se limpiará el almacenamiento local persistente de este navegador y se recargarán los datos iniciales predeterminados.
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:text-stone-800 rounded-xl"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={resetDemoData}
            className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Sí, Restablecer Datos</span>
          </button>
        </div>
      </div>
    </div>
  );
};
