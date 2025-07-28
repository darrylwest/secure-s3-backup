#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { ConfigManager } from './ConfigManager.js';

console.log('secure-s3-backup starting...');

yargs(hideBin(process.argv))
  .command(
    'backup',
    'Run the backup process',
    (yargs) => {
      return yargs.option('config', {
        alias: 'c',
        type: 'string',
        description: 'Path to the configuration file',
      });
    },
    (argv) => {
      try {
        const configManager = new ConfigManager(argv.config);
        const config = configManager.getConfig();
        console.log('Configuration loaded successfully:');
        console.log(JSON.stringify(config, null, 2));
        // TODO: Implement backup logic
      } catch (error) {
        console.error('Error:', (error as Error).message);
        process.exit(1);
      }
    },
  )
  .demandCommand(1, 'You need at least one command before moving on')
  .help().argv;
