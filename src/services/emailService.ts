import nodemailer from 'nodemailer';
import validator from 'validator';
import { BulkSendOptions, ProgressUpdate, SendResult } from '../types';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    const user = process.env.GMAIL_USER;
    const pass = process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      console.warn('Gmail credentials not found in environment variables.');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private validateEmail(email: string): boolean {
    return validator.isEmail(email);
  }

  private personalize(text: string, data: Record<string, string | undefined>): string {
    let personalized = text;
    for (const [key, value] of Object.entries(data)) {
      if (value) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        personalized = personalized.replace(regex, value);
      }
    }
    return personalized;
  }

  async sendBulk(
    options: BulkSendOptions,
    onProgress?: (update: ProgressUpdate) => void
  ): Promise<SendResult[]> {
    const { subject, body, recipients, delayMs = 2000, maxRetries = 1 } = options;
    const results: SendResult[] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      const email = recipient.email;

      if (onProgress) {
        onProgress({
          total: recipients.length,
          sent: sentCount,
          failed: failedCount,
          currentEmail: email,
          results: [...results],
          isComplete: false,
        });
      }

      if (!this.validateEmail(email)) {
        const result: SendResult = {
          email,
          status: 'failed',
          error: 'Invalid email format',
          retryCount: 0,
        };
        results.push(result);
        failedCount++;
        continue;
      }

      const personalizedSubject = this.personalize(subject, recipient);
      const personalizedBody = this.personalize(body, recipient);

      let success = false;
      let attempts = 0;
      let lastError = '';

      while (attempts <= maxRetries && !success) {
        try {
          await this.transporter.sendMail({
            from: process.env.GMAIL_USER,
            to: email,
            subject: personalizedSubject,
            text: personalizedBody.replace(/<[^>]*>?/gm, ''), // Simple HTML to text fallback
            html: personalizedBody,
          });
          success = true;
          sentCount++;
        } catch (error: any) {
          attempts++;
          lastError = error.message;
          if (attempts <= maxRetries) {
            console.log(`Retrying ${email} (Attempt ${attempts + 1})...`);
            await this.delay(1000); // Short delay before retry
          }
        }
      }

      results.push({
        email,
        status: success ? 'success' : 'failed',
        error: success ? undefined : lastError,
        retryCount: attempts - (success ? 1 : 0),
      });

      if (!success) {
        failedCount++;
      }

      // Progress update after each email
      if (onProgress) {
        onProgress({
          total: recipients.length,
          sent: sentCount,
          failed: failedCount,
          currentEmail: email,
          results: [...results],
          isComplete: i === recipients.length - 1,
        });
      }

      // Rate limit protection / Delay between emails
      if (i < recipients.length - 1) {
        await this.delay(delayMs);
      }
    }

    return results;
  }
}
