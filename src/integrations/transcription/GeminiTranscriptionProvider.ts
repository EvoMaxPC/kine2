/**
 * @file GeminiTranscriptionProvider.ts
 * @description Future Phase 2 Gemini Audio Transcription Provider (gemini-3.5-transcribe).
 * 
 * SERVER SIDE ONLY:
 * Audio bytes received from WhatsApp Cloud API are sent to Gemini server-side.
 */

import { ITranscriptionProvider } from './ITranscriptionProvider.ts';

export class GeminiTranscriptionProvider implements ITranscriptionProvider {
  async transcribeAudio(audioData: string | Blob, mimeType?: string): Promise<{ text: string; confidence?: number }> {
    throw new Error('GeminiTranscriptionProvider: Integración para Fase 2 en backend.');
  }
}
