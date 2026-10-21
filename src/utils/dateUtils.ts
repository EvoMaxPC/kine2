const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const DAY_NAMES = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'
];

export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildIsoDateTime(dateStr: string, timeStr: string): string {
  // e.g. "2026-09-29" and "09:00" -> "2026-09-29T09:00:00.000Z" (or local reference)
  return `${dateStr}T${timeStr}:00.000Z`;
}

export function parseDateFromIso(isoString: string): string {
  return isoString.split('T')[0];
}

export function parseTimeFromIso(isoString: string): string {
  const timePart = isoString.split('T')[1];
  return timePart ? timePart.slice(0, 5) : '00:00';
}

export function formatHumanDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = DAY_NAMES[date.getDay()];
  const monthName = MONTH_NAMES[date.getMonth()];
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  return `${capitalizedDay} ${d} de ${monthName}`;
}

export function formatShortDate(dateStr: string): string {
  const today = getTodayDateString();
  const tomorrow = addDays(today, 1);

  if (dateStr === today) return 'Hoy';
  if (dateStr === tomorrow) return 'Mañana';

  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dayName = DAY_NAMES[date.getDay()];
  const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
  return `${capitalizedDay} ${d}/${m}`;
}

export function formatTimeHs(timeStr: string): string {
  return `${timeStr} hs`;
}

export function doIntervalsOverlap(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  const aStart = new Date(startA).getTime();
  const aEnd = new Date(endA).getTime();
  const bStart = new Date(startB).getTime();
  const bEnd = new Date(endB).getTime();

  // Overlap if (aStart < bEnd) and (aEnd > bStart)
  return aStart < bEnd && aEnd > bStart;
}

export function computeEndIso(startIso: string, durationMinutes: number): string {
  const date = new Date(startIso);
  date.setMinutes(date.getMinutes() + durationMinutes);
  return date.toISOString();
}
