// src/ReportGenerator.ts
import { Config } from './ConfigManager.js';
import winston from 'winston';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface ReportData {
  jobsProcessed: number;
  filesUploaded: number;
  filesDeleted: number;
  errors: string[];
}

export class ReportGenerator {
  private readonly transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly config: Config,
    private readonly logger: winston.Logger,
  ) {
    if (this.config.reporting.errorRecipients.length > 0) {
      // A real implementation would require SMTP server details
      // For now, we'll use a mock transporter
      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      this.logger.info('Nodemailer transporter created for error reporting.');
    }
  }

  public async generate(data: ReportData): Promise<void> {
    this.logger.info('Generating reports...');
    const htmlReport = this.createHtmlReport(data);
    const reportPath = this.saveHtmlReport(htmlReport);
    this.logger.info(`HTML report saved to: ${reportPath}`);

    if (data.errors.length > 0 && this.transporter) {
      await this.sendErrorEmail(data.errors);
    }
  }

  private createHtmlReport(data: ReportData): string {
    const date = new Date().toUTCString();
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Backup Report - ${date}</title>
        <style>
          body { font-family: sans-serif; }
          .container { width: 80%; margin: auto; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Backup Report</h1>
          <p><strong>Report generated on:</strong> ${date}</p>
          <h2>Summary</h2>
          <ul>
            <li>Jobs Processed: ${data.jobsProcessed}</li>
            <li>Files Uploaded: ${data.filesUploaded}</li>
            <li>Files Deleted: ${data.filesDeleted}</li>
            <li>Errors: <span class="${data.errors.length > 0 ? 'error' : ''}">${data.errors.length}</span></li>
          </ul>
          ${
            data.errors.length > 0
              ? `<h2>Errors</h2><ul>${data.errors.map((e) => `<li class="error">${e}</li>`).join('')}</ul>`
              : ''
          }
        </div>
      </body>
      </html>
    `;
  }

  private saveHtmlReport(html: string): string {
    const reportDir = this.config.reporting.htmlPath;
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `backup-${timestamp}.html`);
    fs.writeFileSync(reportPath, html);
    return reportPath;
  }

  private async sendErrorEmail(errors: string[]): Promise<void> {
    if (!this.transporter) return;

    const emailBody = `
      <h2>Backup Process Encountered Errors</h2>
      <p>The following errors were reported:</p>
      <ul>
        ${errors.map((e) => `<li>${e}</li>`).join('')}
      </ul>
    `;

    const mailOptions = {
      from: '"Secure S3 Backup" <backup-noreply@example.com>',
      to: this.config.reporting.errorRecipients.join(','),
      subject: 'Backup Job Failed',
      html: emailBody,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      this.logger.info('Error report email sent.', { messageId: info.messageId });
      // For jsonTransport, the message is in info.message
      this.logger.info('Email content:', { email: info.message });
    } catch (error) {
      this.logger.error('Failed to send error report email.', { error });
    }
  }
}
