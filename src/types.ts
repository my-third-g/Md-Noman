export interface EmailRecipient {
  email: string;
  name?: string;
  [key: string]: string | undefined;
}

export interface SendResult {
  email: string;
  status: 'success' | 'failed';
  error?: string;
  retryCount: number;
}

export interface BulkSendOptions {
  subject: string;
  body: string; // Supports HTML and plain text
  recipients: EmailRecipient[];
  delayMs?: number;
  maxRetries?: number;
}

export interface ProgressUpdate {
  total: number;
  sent: number;
  failed: number;
  currentEmail?: string;
  results: SendResult[];
  isComplete: boolean;
}
