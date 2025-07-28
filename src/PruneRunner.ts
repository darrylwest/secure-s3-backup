// src/PruneRunner.ts
import { SecureS3Store } from 'secure-s3-store';
import { Config } from './ConfigManager.js';
import winston from 'winston';

export class PruneRunner {
  constructor(
    private readonly config: Config,
    private readonly store: SecureS3Store,
    private readonly logger: winston.Logger,
  ) {}

  public async runAll(): Promise<void> {
    this.logger.info('Starting prune run for all jobs.');
    for (const job of this.config.jobs) {
      try {
        await this.runJob(job);
      } catch (error) {
        this.logger.error(`Failed to prune backups for job "${job.name}"`, {
          error: (error as Error).message,
        });
      }
    }
    this.logger.info('Prune run finished.');
  }

  private async runJob(job: Config['jobs'][number]): Promise<void> {
    const retentionCount = job.policy.retentionCount;
    if (retentionCount <= 0) {
      this.logger.info(
        `Skipping prune for job "${job.name}" due to retention count policy.`,
      );
      return;
    }

    this.logger.info(`Pruning backups for job: "${job.name}"`);
    const listPath = `${this.config.s3.bucket}/${job.s3KeyPrefix}`;
    const allBackups = await this.store.list(listPath, 0, 10000, true);

    if (allBackups.length <= retentionCount) {
      this.logger.info(
        `No old backups to prune for job "${job.name}". Found ${allBackups.length}, retention is ${retentionCount}.`,
      );
      return;
    }

    // Sort backups by date, oldest first
    const sortedBackups = allBackups.sort();
    const backupsToDelete = sortedBackups.slice(
      0,
      sortedBackups.length - retentionCount,
    );

    this.logger.info(
      `Found ${backupsToDelete.length} old backups to prune for job "${job.name}".`,
    );

    for (const backupKey of backupsToDelete) {
      const deletePath = `${this.config.s3.bucket}/${backupKey}`;
      try {
        this.logger.info(`Deleting old backup: ${deletePath}`);
        await this.store.delete(deletePath);
      } catch (error) {
        this.logger.error(`Failed to delete backup: ${deletePath}`, {
          error: (error as Error).message,
        });
      }
    }
  }
}
