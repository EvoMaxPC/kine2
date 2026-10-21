/**
 * Patient - Entidad PURAMENTE ADMINISTRATIVA.
 * De acuerdo a las directivas de arquitectura de KineTurnos:
 * NO almacenar diagnóstico, patología, lesiones ni notas clínicas en este modelo.
 * La historia clínica futura será un módulo independiente y seguro.
 */
export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsappPhone: string;
  email?: string;
  insurance?: string; // Obra social o cobertura médica administrativa (ej. "Particular", "OSDE")
  insuranceNumber?: string; // Número de afiliado
  administrativeNotes?: string; // Notas de recepción (ej. "Prefiere turno mañana", "Trae orden")
  medicalHistory?: string; // Antecedentes médicos / observaciones administrativas generales
  active: boolean;
  createdAt: string; // ISO 8601 string
}
