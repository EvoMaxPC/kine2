export interface TwilioWebhookLogEntry {
  id: string;
  timestamp: string;
  endpoint: '/api/twilio/whatsapp/inbound' | '/api/twilio/whatsapp/status';
  method: string;
  httpStatus: number;
  signature: {
    provided: boolean;
    header: string;
    validationStatus: 'VALID' | 'INVALID' | 'SKIPPED_NO_TOKEN';
    candidateUrls: string[];
    matchedUrl: string | null;
  };
  headers: Record<string, string>;
  rawPayload: Record<string, any>;
  messageSid?: string;
  from?: string;
  to?: string;
  body?: string;
  messageStatus?: string;
  processingResult?: string;
  error?: string | null;
}
