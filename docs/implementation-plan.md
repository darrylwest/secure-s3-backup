# Implementation Master Plan: `secure-s3-backup`

This document outlines the development plan for the `secure-s3-backup` utility. The project will be broken down into several phases, building upon the functionality of the `secure-s3-store` library.

## Phase 1: Project Scaffolding & Setup

1.  **Initialize npm Project**:

    *   Run `npm init -y` in the `secure-s3-backup` directory.
    *   Create a standard directory structure: `src/`, `docs/`, `test/`, `e2e/`.

2.  **Install Dependencies**:

    *   **Runtime**: `secure-s3-store`, `yargs`, `zod`, `winston`, `winston-daily-rotate-file`, `@dotenvx/dotenvx`, `toml`, `nodemailer`.
    *   **Development**: `typescript`, `ts-node`, `@types/node`, `@types/yargs`, `eslint`, `prettier`, `jest`, `ts-jest`.

3.  **Configure Tooling**:

    *   Create `tsconfig.json` for TypeScript compilation.
    *   Create `eslint.config.js` and `.prettierrc` for code quality.
    *   Create `jest.config.js` for testing.
    *   Add scripts to `package.json` for `build`, `lint`, `test`, `start`, etc.
    *   Create a `.gitignore` file.

## Phase 2: CLI and Configuration

1.  **Implement CLI Commands**:

    *   Use `yargs` to set up the main command structure.
    *   Define a primary `backup` command that takes an optional `--config` flag.
    *   Add subcommands like `list-backups` and `prune-backups` for manual operations.

2.  **Configuration Loading & Validation**:

    *   Create a `ConfigManager` module.
    *   This module will be responsible for:
        *   Finding the configuration file (from CLI flag or default path).
        *   Loading and parsing the JSON or TOML file.
        *   Using `zod` to define a schema and validate the loaded configuration against it.
        *   Loading environment variables using `@dotenvx/dotenvx`.

## Phase 3: Core Backup & Pruning Logic

1.  **Backup Job Runner**:

    *   Create a `BackupRunner` module.
    *   It will be initialized with the validated configuration and an instance of `SecureS3Store`.
    *   It will iterate through the `jobs` defined in the configuration.
    *   For each job, it will read the local file, generate the S3 key, and use `store.put()` to upload it.

2.  **Pruning Logic**:

    *   Create a `PruneRunner` module.
    *   For each job with a `retentionCount` policy, it will:
        *   Use `store.list()` to get all backups for the job's prefix.
        *   Parse timestamps from filenames to determine the age of backups.
        *   Use `store.delete()` to remove backups that exceed the retention count.

## Phase 4: Reporting

1.  **Logging Integration**:

    *   Set up a `winston` logger, similar to `secure-s3-store`.
    *   Integrate logging throughout all modules to record operations, successes, and errors.

2.  **HTML Report Generation**:

    *   Create a `ReportGenerator` module.
    *   It will collect statistics during the backup and prune processes (e.g., files uploaded, files deleted, errors).
    *   After the run, it will generate a simple HTML file summarizing the results and save it to the path specified in the configuration.

3.  **Email Alerting**:

    *   Integrate `nodemailer`.
    *   If any errors are recorded during the run, the `ReportGenerator` will format an error summary and email it to the configured recipients.

## Phase 5: Testing and Documentation

1.  **End-to-End (E2E) Testing**:

    *   Create an `e2e` test script that runs the backup CLI against a real (or mock) S3 service.
    *   The test will:
        *   Create a sample file to be backed up.
        *   Run the backup command.
        *   Verify that the file was uploaded and encrypted correctly using `secure-s3-store`'s `get` method.
        *   Run the prune command and verify that old files are deleted.

2.  **Unit Testing**:

    *   Write unit tests for individual modules (`ConfigManager`, `ReportGenerator`, etc.), mocking their dependencies.

3.  **Documentation**:

    *   Update `README.md` with detailed usage instructions, configuration options, and examples.
    *   Include a section on security best practices, emphasizing the importance of managing `.env` files and IAM permissions.

