# PRD: `secure-s3-backup` NPM Package


## 1. Overview


### 1.1 Project Goal

To create a simple, secure, and DevOps-friendly npm backup utility for storing and retrieving encrypted backups from any S3-compatible object storage service (e.g., AWS S3, DigitalOcean Spaces).

### 1.2 Problem Statement

DevOps need an automated way to periodically backup sensitive data blobs (e.g., API keys, database files, configuration files) in object storage. They also need an automated way to clean up or remove old backups.  This requires these steps:

1. define the backup policies (every day, on-change-only, etc)
2. define the files and paths that to be backed up and assign the policies for that file
3. fetch a list backed up files in a bucket
4. prune out old files (again using established policies)

### 1.3 Target Audience

DevOps engineers responsible for maintaining cloud environments.

**Note**: _the target platform is any linux-like OS, Ubuntu, Darwin, etc._

## 2. Core Features

This CLI application reads a configuration file to 1) establish polices and 2) define files that need to be backed up using policies.  The backup configuation should be JSON or toml to make it easy for DevOps to update.  Backup scripts are usually triggered by `cron` or some other scheduling application.

### 2.1 Application starup

On startup the application reads its configuration file from a standard location, or specified in a local .env file or env setting.  The standard locaion is a config folder with either config.json or config.toml in the folder.  If the configuration is not located or can't be parsed an error will be logged and the application quits.

### 2.2 Configuration Process

After reading and parsing the configuration it's checked accuracy (missing or mislabed polices) and if no errors are detected the backup process begins.  If a backup entry has an error, the process will log the error but continue to the backup process.

### 2.3 Backup Process

Backups are processed in one at a time, or in parallel if the policy permits (e.g., max_jobs=4).  The maximum parallel backup jobs is limited by a global policy.  For small files it is customary to set the policy to parallel.  Large files are set to serial to ensure proper memory management. 

Some files should be backed up in pairs, e.g., dump.rdb and appendonly.aof.  For that condition their is a `group` policy with a group name.

### 2.4 Reporting

Reporting has three targets: 

1. logging to the rolling file logger with log levels set in the config file
2. the backup summary list report.  The summary report is in html and placed in the folder of a static web service (from configuration).
3. if there are any errors, the error summary report is sent to a list of email addresses, defined in the configuration file.

The html filename uses ISO8601 date/time format to produce backup-YYYY-MM-DDTHH:MM:SS.html and error-YYYY-MM-DDTHH:MM:SS.html for errors (only if there are errors).

## 3 Implementation

### 3.1 Application Startup

The application will be a command-line interface (CLI) built using `yargs`. On startup, it will:
1.  Use `@dotenvx/dotenvx` to load environment variables from a `.env` file. This is where S3 credentials and encryption keys will be stored.
2.  Parse CLI arguments to find the path to a configuration file. If no path is provided, it will look in a default location (e.g., `~/.config/secure-s3-backup/config.json`).
3.  Initialize a `winston` logger for detailed, rotating file logs, similar to the `secure-s3-store` library.

### 3.2 Configuration Process

The application will read and parse the JSON/TOML configuration file. The configuration will be validated using `zod` to ensure all required fields are present and correctly formatted.

A sample `config.json` structure:
```json
{
  "s3": {
    "bucket": "my-backup-bucket"
  },
  "reporting": {
    "htmlPath": "/var/www/html/backups",
    "errorRecipients": ["ops@example.com"]
  },
  "jobs": [
    {
      "name": "Daily Redis Backup",
      "path": "/var/lib/redis/dump.rdb",
      "s3KeyPrefix": "redis-backups/",
      "policy": {
        "retentionCount": 7,
        "frequency": "daily"
      }
    }
  ]
}
```

### 3.3 Backup Process

The core backup logic will be orchestrated by the application, relying on `secure-s3-store` for all S3 interactions.
1.  **Initialization**: The application will instantiate `SecureS3Store` using the S3 configuration from `config.json` and the credentials/keys from the environment.
2.  **Job Execution**: For each job in the configuration:
    a. Read the local file specified in `job.path`.
    b. Generate a unique, timestamped object key (e.g., `redis-backups/dump.rdb-2025-07-27T10:00:00Z.bak`).
    c. Call `store.put(s3Path, fileData)` to encrypt and upload the file. The `secure-s3-store` library handles all encryption, including key selection (using `primaryKey`) and embedding the Key ID (KID) for future decryption.
3.  **Pruning Old Backups**: After a successful upload for a job:
    a. Call `store.list(bucket, job.s3KeyPrefix)` to get a list of all existing backups for that job.
    b. Sort the returned keys by the timestamp in the filename.
    c. If the number of backups exceeds the `retentionCount` policy, delete the oldest ones by calling `store.delete()` on each excess file.

### 3.4 Summary Reporting Process

1.  **Logging**: All operations, successes, and failures will be logged to a rotating log file using the configured `winston` instance.
2.  **HTML Report**: After all jobs are processed, the application will generate a simple HTML file containing a summary table of all actions taken (uploads, deletions) and any errors encountered.
3.  **Email Alerts**: If any job results in an error, the application will use a library like `nodemailer` to compile the errors into a single report and email it to the `errorRecipients` list from the configuration.

## 6. Security Considerations

Security is paramount and is primarily handled by the `secure-s3-store` dependency, with configuration and operational security handled by this utility.

-   **Encryption at Rest**: All backup data is encrypted at rest using **AES-256-GCM**, a modern authenticated encryption cipher. This is a core feature of the `secure-s3-store` library and is not optional.
-   **Data Integrity**: The use of AES-GCM ensures that each backup is protected by an authentication tag. This makes it computationally infeasible to tamper with or modify a backup without being detected during the restore process.
-   **Key Management & Rotation**: The `secure-s3-store` library is built with key rotation in mind. It requires a `primaryKey` for new encryptions and a `keys` object for decryption. This allows DevOps to rotate keys seamlessly:
    1.  Add a new key (e.g., `v2`) to the `.env` file.
    2.  Update the `PRIMARY_KEY` in `.env` to point to `v2`.
    3.  The backup utility will automatically start using the new key for all new backups.
    4.  Old backups, encrypted with previous keys (e.g., `v1`), remain fully restorable as long as the old keys are present in the `.env` file.
-   **Credential Security**: All sensitive credentials (AWS keys, encryption keys) **must** be stored in a `.env` file and loaded into the environment. This file should never be committed to source control. For production environments, it is strongly recommended to use a secrets management service (e.g., AWS Secrets Manager, HashiCorp Vault) to inject these secrets at runtime.
-   **S3 Access Control**: It is recommended to create a dedicated IAM user or role for the backup utility with the minimum required permissions, scoped to the specific backup bucket. Necessary permissions include `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`, and `s3:ListBucket`.

###### dpw | 2025.07.27