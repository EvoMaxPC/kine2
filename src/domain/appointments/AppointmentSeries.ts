export type SeriesFrequency = 'WEEKLY' | 'TWICE_WEEKLY' | 'CUSTOM_DAYS';
export type SeriesStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface AppointmentSeries {
  id: string;
  patientId: string;
  professionalId: string;
  appointmentTypeId?: string;
  frequency: SeriesFrequency;
  daysOfWeek: number[]; // 1 = Lunes, 2 = Martes, etc.
  timeSlots: { [dayOfWeek: number]: string }; // e.g. { 2: "10:00", 4: "10:00" }
  totalAppointments: number;
  createdAppointmentIds: string[];
  createdAt: string; // ISO 8601
  status: SeriesStatus;
  notes?: string;
}

export interface SeriesSlotPreview {
  date: string;
  dayOfWeek: number;
  dayName: string;
  time: string;
  startIso: string;
  endIso: string;
  isAvailable: boolean;
  conflictReason?: string;
}
