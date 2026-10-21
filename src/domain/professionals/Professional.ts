export interface WorkingInterval {
  start: string; // "08:00"
  end: string;   // "12:00"
}

export interface DayScheduleConfig {
  dayOfWeek: number; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  dayName: string;
  active: boolean;
  start?: string; // Para compatibilidad: "09:00"
  end?: string;   // Para compatibilidad: "19:00"
  intervals: WorkingInterval[]; // Soporte multi-franja por día (ej. 08:00-12:00 y 15:00-19:00)
}

export interface Professional {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  specialty?: string;
  active: boolean;
  displayColor?: string;
  licenseNumber?: string;
  defaultDurationMinutes: number;
  workingSchedule?: DayScheduleConfig[];
}
