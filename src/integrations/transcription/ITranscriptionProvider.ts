export interface ITranscriptionProvider {
  transcribeAudio(audioData: string | Blob, mimeType?: string): Promise<{ text: string; confidence?: number }>;
}
