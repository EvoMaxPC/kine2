export interface AppointmentType {
  id: string;
  name: string; // ej: "Sesión estándar", "Evaluación inicial"
  durationMinutes: number; // ej: 45, 60
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  active: boolean;
  displayColor?: string;
  description?: string;
}

export const DEFAULT_APPOINTMENT_TYPES: AppointmentType[] = [
  {
    id: 'apt_type_standard',
    name: 'Sesión estándar',
    durationMinutes: 45,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    active: true,
    displayColor: '#0D9488', // Teal
    description: 'Sesión regular de rehabilitación kinesiológica',
  },
  {
    id: 'apt_type_evaluation',
    name: 'Evaluación inicial',
    durationMinutes: 60,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    active: true,
    displayColor: '#4F46E5', // Indigo
    description: 'Primera consulta kinesiológica y confección de ficha',
  },
  {
    id: 'apt_type_short',
    name: 'Control / Sesión breve',
    durationMinutes: 30,
    bufferBeforeMinutes: 0,
    bufferAfterMinutes: 0,
    active: true,
    displayColor: '#059669', // Emerald
    description: 'Control de evolución o aplicación puntual de fisioterapia',
  },
];
