export interface ScheduleBlock {
  id: string;
  professionalId: string;
  startAt: string; // ISO 8601
  endAt: string; // ISO 8601
  reason?: string; // "Descanso" | "Trámite" | "Reunión" | "Motivo personal" | string
  createdAt: string;
}
