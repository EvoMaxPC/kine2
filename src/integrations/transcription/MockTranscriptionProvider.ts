import { ITranscriptionProvider } from './ITranscriptionProvider.ts';

export class MockTranscriptionProvider implements ITranscriptionProvider {
  async transcribeAudio(audioData: string | Blob, mimeType?: string): Promise<{ text: string; confidence: number }> {
    return {
      text: 'Hola, mañana a las cuatro no puedo. ¿Tendrás algo después de las seis?',
      confidence: 0.98,
    };
  }
}
