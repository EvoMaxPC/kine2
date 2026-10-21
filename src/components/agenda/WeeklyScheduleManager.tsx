import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Copy,
  CheckCircle2,
  AlertCircle,
  Archive,
  Clock,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  WeeklySchedule,
  WeeklyScheduleStatus,
  getIsoWeekNumber,
} from '../../domain/appointments/WeeklySchedule.ts';
import { PersistentWeeklyScheduleRepository } from '../../repositories/persistent/PersistentWeeklyScheduleRepository.ts';
import { getTodayDateString, addDays, formatHumanDate } from '../../utils/dateUtils.ts';

interface WeeklyScheduleManagerProps {
  onScheduleUpdated?: () => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const repo = new PersistentWeeklyScheduleRepository();

export const WeeklyScheduleManager: React.FC<WeeklyScheduleManagerProps> = ({
  onScheduleUpdated,
  showToast,
}) => {
  const [schedules, setSchedules] = useState<WeeklySchedule[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeeklySchedule | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const list = await repo.getAllSchedules();
      setSchedules(list);
      if (!selectedWeek && list.length > 0) {
        // Seleccionar por defecto la semana actual o la primera en DRAFT/PUBLISHED
        const today = getTodayDateString();
        const curr = getIsoWeekNumber(today);
        const match = list.find((s) => s.year === curr.year && s.weekNumber === curr.weekNumber) || list[0];
        setSelectedWeek(match);
      } else if (selectedWeek) {
        const refreshed = list.find((s) => s.id === selectedWeek.id) || list[0];
        setSelectedWeek(refreshed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleCopyPreviousWeek = async () => {
    if (!selectedWeek) return;
    try {
      const targetYear = selectedWeek.year;
      const targetWeek = selectedWeek.weekNumber;
      const copied = await repo.copyFromPreviousWeek(targetYear, targetWeek);
      setSelectedWeek(copied);
      await loadSchedules();
      showToast(`Plantilla copiada desde la semana anterior para Semana ${targetWeek}`, 'success');
      onScheduleUpdated?.();
    } catch (err: any) {
      showToast(err.message || 'Error copiando semana', 'error');
    }
  };

  const handlePublishWeek = async () => {
    if (!selectedWeek) return;
    try {
      const published = await repo.publishSchedule(selectedWeek.id);
      setSelectedWeek(published);
      try {
        await fetch('/api/kine/weekly-schedules/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedWeek.id }),
        });
      } catch (err) {
        console.warn('[WeeklyScheduleManager] Error sync con server:', err);
      }
      await loadSchedules();
      showToast(`¡Semana ${published.weekNumber} (${published.year}) PUBLICADA! La secretaria digital ahora puede ofrecer turnos.`, 'success');
      onScheduleUpdated?.();
    } catch (err: any) {
      showToast(err.message || 'Error publicando semana', 'error');
    }
  };

  const handleToggleDay = (dayIndex: number) => {
    if (!selectedWeek) return;
    const updatedDays = [...selectedWeek.days];
    updatedDays[dayIndex].active = !updatedDays[dayIndex].active;
    const updated = { ...selectedWeek, days: updatedDays };
    setSelectedWeek(updated);
  };

  const handleTimeChange = (dayIndex: number, field: 'start' | 'end', val: string) => {
    if (!selectedWeek) return;
    const updatedDays = [...selectedWeek.days];
    updatedDays[dayIndex][field] = val;
    const updated = { ...selectedWeek, days: updatedDays };
    setSelectedWeek(updated);
  };

  const handleSaveEdits = async () => {
    if (!selectedWeek) return;
    try {
      await repo.saveSchedule(selectedWeek);
      await loadSchedules();
      setIsEditing(false);
      showToast('Horarios de la semana guardados correctamente', 'success');
      onScheduleUpdated?.();
    } catch (err: any) {
      showToast(err.message || 'Error guardando horarios', 'error');
    }
  };

  const getStatusBadge = (status: WeeklyScheduleStatus) => {
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>PUBLICADA</span>
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3.5 h-3.5" />
            <span>BORRADOR (DRAFT)</span>
          </span>
        );
      case 'ARCHIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 border border-stone-300 dark:border-stone-700">
            <Archive className="w-3.5 h-3.5" />
            <span>ARCHIVADA</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-[#121B17] rounded-3xl border border-stone-200 dark:border-stone-800 p-6 shadow-xs space-y-6">
      {/* Header and Week Switcher */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-stone-200/80 dark:border-stone-800/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200/60 dark:border-teal-800/60 text-teal-800 dark:text-teal-300 text-xs font-semibold mb-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Gestión de Agenda Semanal (WeeklySchedule)</span>
          </div>
          <h3 className="text-lg font-black text-stone-900 dark:text-stone-100 tracking-tight">
            Planificación de Semanas y Disponibilidad
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Prepara la semana siguiente el domingo, copia la configuración anterior y publícala para habilitar turnos en la secretaria digital.
          </p>
        </div>

        {/* Action Controls */}
        {selectedWeek && (
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <button
              onClick={handleCopyPreviousWeek}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 font-bold text-xs transition-all"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Semana Anterior</span>
            </button>

            {selectedWeek.status === 'DRAFT' && (
              <button
                onClick={handlePublishWeek}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition-all active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>PUBLICAR SEMANA</span>
              </button>
            )}

            {isEditing ? (
              <button
                onClick={handleSaveEdits}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Guardar Cambios</span>
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 font-bold text-xs transition-all"
              >
                <span>Editar Horarios</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Week Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {schedules.map((s) => {
          const isSelected = selectedWeek?.id === s.id;
          return (
            <button
              key={s.id}
              onClick={() => {
                setSelectedWeek(s);
                setIsEditing(false);
              }}
              className={`px-3.5 py-2 rounded-2xl border text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-stone-900 dark:bg-white text-white dark:text-stone-900 border-transparent shadow-xs'
                  : 'bg-stone-50 dark:bg-stone-900/60 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-stone-400'
              }`}
            >
              <span>Semana {s.weekNumber} ({formatHumanDate(s.startDate).split(',')[0]} - {formatHumanDate(s.endDate).split(',')[0]})</span>
              {getStatusBadge(s.status)}
            </button>
          );
        })}
      </div>

      {/* Days Grid Editor */}
      {selectedWeek && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
              Configuración de Días y Franjas Horarias
            </span>
            <span className="text-[11px] text-stone-500 dark:text-stone-400">
              {selectedWeek.status === 'PUBLISHED'
                ? '● Semana Activa para la Secretaria Digital'
                : '○ La secretaria no ofrecerá turnos de esta semana hasta que la publiques'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {selectedWeek.days.map((day, idx) => (
              <div
                key={day.dayOfWeek}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  day.active
                    ? 'bg-stone-50/80 dark:bg-stone-900/40 border-stone-200 dark:border-stone-800'
                    : 'bg-stone-100/50 dark:bg-stone-950/40 border-dashed border-stone-300 dark:border-stone-800/80 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-stone-900 dark:text-stone-100 text-xs">
                    {day.dayName}
                  </span>
                  {isEditing ? (
                    <input
                      type="checkbox"
                      checked={day.active}
                      onChange={() => handleToggleDay(idx)}
                      className="rounded accent-teal-600 cursor-pointer"
                    />
                  ) : (
                    <span
                      className={`w-2 h-2 rounded-full ${
                        day.active ? 'bg-emerald-500' : 'bg-stone-400'
                      }`}
                    />
                  )}
                </div>

                {day.active ? (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-stone-600 dark:text-stone-400 text-[11px]">
                      <span>Inicio:</span>
                      {isEditing ? (
                        <input
                          type="time"
                          value={day.start}
                          onChange={(e) => handleTimeChange(idx, 'start', e.target.value)}
                          className="px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-mono"
                        />
                      ) : (
                        <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{day.start} hs</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-stone-600 dark:text-stone-400 text-[11px]">
                      <span>Cierre:</span>
                      {isEditing ? (
                        <input
                          type="time"
                          value={day.end}
                          onChange={(e) => handleTimeChange(idx, 'end', e.target.value)}
                          className="px-1.5 py-0.5 rounded border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-mono"
                        />
                      ) : (
                        <span className="font-mono font-bold text-stone-800 dark:text-stone-200">{day.end} hs</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-400 italic">No laborable</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
