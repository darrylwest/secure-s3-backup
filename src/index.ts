#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { ConfigManager } from './ConfigManager.js';
import { BackupRunner } from './BackupRunner.js';
import { PruneRunner } from './PruneRunner.js';
import { ReportGenerator, ReportData } from './ReportGenerator.js';
import { SecureS3Store } from 'secure-s3-store';
import { configureLogger } from './logger.js';
import 'dotenvx/config';

const logger = configureLogger();

logger.info('secure-s3-backup starting...');

await yargs(hideBin(process.argv))
  .command(
    'backup',
    'Run the backup and prune process',
    (yargs) => {
      return yargs.option('config', {
        alias: 'c',
        type: 'string',
        description: 'Path to the configuration file',
      });
    },
    async (argv) => {
      const reportData: ReportData = {
        jobsProcessed: 0,
        filesUploaded: 0,
        filesDeleted: 0,
        errors: [],
      };

      try {
        const configManager = new ConfigManager(argv.config);
        const config = configManager.getConfig();
        reportData.jobsProcessed = config.jobs.length;

        const keys: { [kid: string]: string } = {};
        if (process.env.KEY_V1) keys.v1 = process.env.KEY_V1;
        if (process.env.KEY_V2) keys.v2 = process.env.KEY_V2;

        const store = new SecureS3Store({
          keys,
          primaryKey: process.env.PRIMARY_KEY || 'v1',
          s3Config: {
            endpoint: process.env.S3_ENDPOINT,
            region: process.env.S3_REGION,
            credentials: {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
            },
          },
          logger,
        });

        const backupRunner = new BackupRunner(config, store, logger);
        const backupResult = await backupRunner.runAll();
        reportData.filesUploaded = backupResult.filesUploaded;
        reportData.errors.push(...backupResult.errors);

        const pruneRunner = new PruneRunner(config, store, logger);
        const pruneResult = await pruneRunner.runAll();
        reportData.filesDeleted = pruneResult.filesDeleted;
        reportData.errors.push(...pruneResult.errors);

        logger.info('Backup and prune process completed.');
      } catch (error) {
        const errorMessage = (error as Error).message;
        logger.error('A critical error occurred during the backup process:', {
          error: errorMessage,
        });
        reportData.errors.push(`Critical: ${errorMessage}`);
      } finally {
        const configManager = new ConfigManager(argv.config);
        const config = configManager.getConfig();
        const reportGenerator = new ReportGenerator(config, logger);
        await reportGenerator.generate(reportData);
        logger.info('Reporting process finished.');
        if (reportData.errors.length > 0) {
          process.exit(1);
        }
      }
    },
  )
  .demandCommand(1, 'You need at least one command before moving on')
  .help().argv;

