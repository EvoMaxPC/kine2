export interface ReminderPolicy {
  enabled: boolean;
  hoursBeforeAppointment: number; // e.g. 24 or 2
  templateText: string;
  autoSendInDemo: boolean;
}

export const DEFAULT_REMINDER_POLICY: ReminderPolicy = {
  enabled: true,
  hoursBeforeAppointment: 24,
  templateText: 'Hola {patientName}, te recordamos tu turno de kinesiología programado para mañana a las {timeHs} hs en el consultorio. Por favor confirmá tu asistencia respondiendo CONFIRMAR o CANCELAR.',
  autoSendInDemo: false,
};
