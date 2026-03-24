import { EmailService } from './src/services/emailService';
import { parseCSV } from './src/services/csvService';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import SingleBar from 'cli-progress';
import dotenv from 'dotenv';

dotenv.config();

async function runCLI() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log(chalk.cyan('\nBulk Mailer Pro - CLI Interface'));
    console.log(chalk.yellow('Usage: node cli.js <csv_file> <subject> <body_file> [delay_ms]'));
    console.log('Example: node cli.js recipients.csv "Hello World" message.html 2000\n');
    process.exit(1);
  }

  const [csvPath, subject, bodyPath, delayStr] = args;
  const delayMs = delayStr ? parseInt(delayStr) : 2000;

  try {
    // Read files
    const csvContent = fs.readFileSync(path.resolve(csvPath), 'utf-8');
    const bodyContent = fs.readFileSync(path.resolve(bodyPath), 'utf-8');

    // Parse recipients
    const recipients = parseCSV(csvContent);
    console.log(chalk.blue(`\nLoaded ${recipients.length} recipients from ${csvPath}`));

    const emailService = new EmailService();
    const progressBar = new SingleBar.SingleBar({
      format: 'Sending |' + chalk.cyan('{bar}') + '| {percentage}% || {value}/{total} Emails || Current: {email}',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    });

    console.log(chalk.green('\nStarting bulk send...\n'));
    progressBar.start(recipients.length, 0, { email: 'Starting...' });

    const results = await emailService.sendBulk(
      {
        subject,
        body: bodyContent,
        recipients,
        delayMs,
        maxRetries: 1
      },
      (progress) => {
        progressBar.update(progress.sent + progress.failed, { email: progress.currentEmail });
      }
    );

    progressBar.stop();

    // Summary
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log('\n' + chalk.bold('--- Summary ---'));
    console.log(chalk.green(`Successfully sent: ${successful}`));
    console.log(chalk.red(`Failed: ${failed}`));

    if (failed > 0) {
      console.log(chalk.red('\nFailed Emails:'));
      results.filter(r => r.status === 'failed').forEach(r => {
        console.log(`- ${r.email}: ${r.error}`);
      });
    }

    console.log(chalk.blue('\nDone!\n'));

  } catch (error: any) {
    console.error(chalk.red(`\nError: ${error.message}\n`));
    process.exit(1);
  }
}

runCLI();
