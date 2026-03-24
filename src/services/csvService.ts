import { parse } from 'csv-parse/sync';
import { EmailRecipient } from '../types';

export function parseCSV(csvContent: string): EmailRecipient[] {
  try {
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    return records.map((record: any) => {
      // Ensure there's an email field, case-insensitive
      const emailKey = Object.keys(record).find(k => k.toLowerCase() === 'email');
      if (!emailKey) {
        throw new Error('CSV must contain an "email" column.');
      }

      return {
        ...record,
        email: record[emailKey],
      };
    });
  } catch (error: any) {
    throw new Error(`Failed to parse CSV: ${error.message}`);
  }
}
