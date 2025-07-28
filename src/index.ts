#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { ConfigManager } from './ConfigManager.js';
import { BackupRunner } from './BackupRunner.js';
import { PruneRunner } from './PruneRunner.js';
import { SecureS3Store } from 'secure-s3-store';
import { configureLogger } from './logger.js';
import 'dotenvx/config';

const logger = configureLogger();

logger.info('secure-s3-backup starting...');

yargs(hideBin(process.argv))
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
      try {
        const configManager = new ConfigManager(argv.config);
        const config = configManager.getConfig();
        
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
        await backupRunner.runAll();

        const pruneRunner = new PruneRunner(config, store, logger);
        await pruneRunner.runAll();

        logger.info('Backup and prune process completed successfully.');
      } catch (error) {
        logger.error('An error occurred during the backup process:', {
          error: (error as Error).message,
        });
        process.exit(1);
      }
    },
  )
  .demandCommand(1, 'You need at least one command before moving on')
  .help().argv;
