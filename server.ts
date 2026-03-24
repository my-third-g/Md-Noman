import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { EmailService } from './src/services/emailService';
import { parseCSV } from './src/services/csvService';

dotenv.config();

async function startServer() {
  console.log('Starting server initialization...');
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  const emailService = new EmailService();

  // API Routes
  app.post('/api/send-bulk', async (req, res) => {
    const { subject, body, recipients, csvContent, delayMs, maxRetries } = req.body;

    let finalRecipients = recipients || [];

    if (csvContent) {
      try {
        finalRecipients = parseCSV(csvContent);
      } catch (error: any) {
        return res.status(400).json({ error: error.message });
      }
    }

    if (!finalRecipients.length) {
      return res.status(400).json({ error: 'No recipients provided.' });
    }

    // In a real production app, we'd use a background job/worker (like BullMQ)
    // and return a job ID. For this tool, we'll stream progress if possible,
    // but for simplicity here we'll just start the process.
    // Since we want real-time progress in the UI, we'll use a simple event-based approach
    // or just return the final results if it's small.
    // For the UI, we'll implement a polling or SSE mechanism if needed, 
    // but let's stick to a simple response for now or a long-running request.

    try {
      const results = await emailService.sendBulk({
        subject,
        body,
        recipients: finalRecipients,
        delayMs,
        maxRetries
      });
      res.json({ results });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
