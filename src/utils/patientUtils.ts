import { Patient } from '../types/index.ts';
import { getComparablePhoneDigits } from './phoneUtils.ts';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType?: 'WHATSAPP' | 'PHONE' | 'NAME_AND_PHONE' | 'EXACT_NAME';
  matchedPatient?: Patient;
  reason?: string;
}

export function detectPotentialDuplicatePatient(
  candidate: {
    firstName: string;
    lastName: string;
    phone?: string;
    whatsappPhone?: string;
  },
  existingPatients: Patient[],
  excludePatientId?: string
): DuplicateCheckResult {
  const normFirst = candidate.firstName.trim().toLowerCase();
  const normLast = candidate.lastName.trim().toLowerCase();
  const candidatePhoneDigits = candidate.phone ? getComparablePhoneDigits(candidate.phone) : '';
  const candidateWaDigits = candidate.whatsappPhone ? getComparablePhoneDigits(candidate.whatsappPhone) : '';

  for (const existing of existingPatients) {
    if (excludePatientId && existing.id === excludePatientId) {
      continue;
    }

    const exPhoneDigits = getComparablePhoneDigits(existing.phone);
    const exWaDigits = getComparablePhoneDigits(existing.whatsappPhone);

    // 1. Coincidencia por WhatsApp (dígitos significativos iguales)
    if (
      candidateWaDigits &&
      candidateWaDigits.length >= 8 &&
      (candidateWaDigits === exWaDigits || candidateWaDigits === exPhoneDigits)
    ) {
      return {
        isDuplicate: true,
        matchType: 'WHATSAPP',
        matchedPatient: existing,
        reason: `Mismo número de WhatsApp (${existing.whatsappPhone}) que ${existing.firstName} ${existing.lastName}`,
      };
    }

    // 2. Coincidencia por Teléfono
    if (
      candidatePhoneDigits &&
      candidatePhoneDigits.length >= 8 &&
      (candidatePhoneDigits === exPhoneDigits || candidatePhoneDigits === exWaDigits)
    ) {
      return {
        isDuplicate: true,
        matchType: 'PHONE',
        matchedPatient: existing,
        reason: `Mismo número de teléfono (${existing.phone}) que ${existing.firstName} ${existing.lastName}`,
      };
    }

    // 3. Coincidencia por Nombre + Teléfono similar (primeros dígitos o subcadena)
    const exFirst = existing.firstName.trim().toLowerCase();
    const exLast = existing.lastName.trim().toLowerCase();
    const sameName = (normFirst === exFirst && normLast === exLast) ||
                     (normFirst.includes(exFirst) && normLast.includes(exLast)) ||
                     (exFirst.includes(normFirst) && exLast.includes(normLast));

    if (sameName) {
      // Si además comparten al menos 6 dígitos
      if (
        (candidatePhoneDigits && exPhoneDigits.includes(candidatePhoneDigits.slice(-6))) ||
        (candidateWaDigits && exWaDigits.includes(candidateWaDigits.slice(-6)))
      ) {
        return {
          isDuplicate: true,
          matchType: 'NAME_AND_PHONE',
          matchedPatient: existing,
          reason: `Nombre y teléfono similar a ${existing.firstName} ${existing.lastName}`,
        };
      }

      // Si los nombres son idénticos
      if (normFirst === exFirst && normLast === exLast) {
        return {
          isDuplicate: true,
          matchType: 'EXACT_NAME',
          matchedPatient: existing,
          reason: `Ya existe un paciente con el nombre idéntico "${existing.firstName} ${existing.lastName}"`,
        };
      }
    }
  }

  return { isDuplicate: false };
}
