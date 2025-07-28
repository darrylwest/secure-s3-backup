// src/BackupRunner.ts
import { SecureS3Store } from 'secure-s3-store';
import { Config } from './ConfigManager.js';
import fs from 'fs';
import path from 'path';
import winston from 'winston';

export interface BackupResult {
  filesUploaded: number;
  errors: string[];
}

export class BackupRunner {
  constructor(
    private readonly config: Config,
    private readonly store: SecureS3Store,
    private readonly logger: winston.Logger,
  ) {}

  public async runAll(): Promise<BackupResult> {
    this.logger.info('Starting backup run for all jobs.');
    const result: BackupResult = { filesUploaded: 0, errors: [] };

    for (const job of this.config.jobs) {
      try {
        const uploaded = await this.runJob(job);
        if (uploaded) {
          result.filesUploaded++;
        }
      } catch (error) {
        const errorMessage = `Failed to run job "${job.name}": ${(error as Error).message}`;
        this.logger.error(errorMessage, { error });
        result.errors.push(errorMessage);
      }
    }
    this.logger.info('Backup run finished.');
    return result;
  }

  private async runJob(job: Config['jobs'][number]): Promise<boolean> {
    this.logger.info(`Running backup job: "${job.name}"`);
    const fileData = await this.readFile(job.path);

    if (!fileData) {
      this.logger.warn(`Skipping job "${job.name}" because file not found at: ${job.path}`);
      return false;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${path.basename(job.path)}-${timestamp}.bak`;
    const s3Path = `${this.config.s3.bucket}/${job.s3KeyPrefix}${backupFileName}`;

    this.logger.info(`Uploading backup to ${s3Path}`);
    await this.store.put(s3Path, fileData);
    this.logger.info(`Successfully uploaded backup for job "${job.name}"`);
    return true;
  }

  private async readFile(filePath: string): Promise<Buffer | null> {
    try {
      return await fs.promises.readFile(filePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }
}
