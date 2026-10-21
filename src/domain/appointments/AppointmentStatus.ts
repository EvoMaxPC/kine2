export enum AppointmentStatus {
  REQUESTED = 'REQUESTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  CONFIRMED = 'CONFIRMED',
  CHANGE_PENDING = 'CHANGE_PENDING',
  CANCEL_PENDING = 'CANCEL_PENDING',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  NO_SHOW = 'NO_SHOW',
}

export const VALID_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = Object.values(AppointmentStatus);

export function isValidAppointmentStatus(status: string): status is AppointmentStatus {
  return VALID_APPOINTMENT_STATUSES.includes(status as AppointmentStatus);
}
