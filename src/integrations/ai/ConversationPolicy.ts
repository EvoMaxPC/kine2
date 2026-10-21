/**
 * @file ConversationPolicy.ts
 * @description Guidelines and deterministic response generators for the digital assistant.
 * 
 * POLICY RULES (Section 13):
 * - Profesional, cálida, humana, clara, natural, breve.
 * - No infantil, no excesivamente informal, no robótica, sin jerga técnica.
 * - NUNCA inventar disponibilidad.
 * - Identificarse como "la asistente virtual del consultorio".
 */

import { PatientIntent, StructuredAiExtraction } from './PatientIntent.ts';

export class ConversationPolicy {
  /**
   * Generates a conversational response when a request has been submitted for staff review.
   */
  static generateChangeRequestedMessage(
    patientFirstName: string,
    requestedDateHuman: string,
    requestedTimeHuman: string
  ): string {
    return `Perfecto ${patientFirstName}, ya dejé solicitada la reprogramación para el ${requestedDateHuman} a las ${requestedTimeHuman}. Apenas quede confirmada por el consultorio te aviso por acá.`;
  }

  /**
   * Generates a conversational message when an appointment is confirmed.
   */
  static generateConfirmedMessage(
    patientFirstName: string,
    dateHuman: string,
    timeHuman: string
  ): string {
    return `¡Listo, ${patientFirstName}! Tu turno quedó confirmado para el ${dateHuman} a las ${timeHuman}. ¡Te esperamos!`;
  }

  /**
   * Generates an alternative proposition message when the requested slot is busy.
   */
  static generateSlotUnavailableMessage(
    patientFirstName: string,
    availableSlotsHuman: string[]
  ): string {
    if (availableSlotsHuman.length === 0) {
      return `Hola ${patientFirstName}, ese horario ya está ocupado y no nos quedan espacios en ese día. ¿Te gustaría coordinar para el siguiente día hábil?`;
    }
    const options = availableSlotsHuman.slice(0, 2).join(' o ');
    return `Ese horario ya está ocupado. Tengo disponibilidad ${options}. ¿Alguno te sirve?`;
  }

  /**
   * Validates clarification constraint: If intent is AMBIGUOUS, requiresClarification MUST be true.
   */
  static validateExtractionContract(extraction: StructuredAiExtraction): boolean {
    if (extraction.intent === PatientIntent.AMBIGUOUS && !extraction.requiresClarification) {
      return false;
    }
    return true;
  }
}
