# PRD: `secure-s3-backup` NPM Package


## 1. Overview


### 1.1 Project Goal

To create a simple, secure, and developer-friendly npm backup utility for storing and retrieving encrypted backups from any S3-compatible object storage service (e.g., AWS S3, DigitalOcean Spaces).

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

This CLI application reads a configuration file to 1) establish polices and 2) defines the files that need to be backed up using policies.  The backup configuation should be JSON or toml to make it easy for the DevOps person to update.  Backup scripts are usually triggered by `cron` or some other scheduling application.

### 2.1 Application starup

On startup the application reads its configuration file from a standard location, or specified in a local .env file or env setting.  The standard locaiont is a config folder with either config.json or config.toml in the folder.  If the configuration is not located or can't be parsed an error will be logged and the application quits.

### 2.2 Configuration Process

After reading and parsing the configuration it's checked accuracy (missing or mislabed polices) and if no errors are detected the backup process begins.  If a backup entry has an error, the process will log the error but continue to the backup process.

### 2.3 Backup Process

Backups are processed in one at a time, or in parallel if the policy permits.  The maximum parallel backup jobs is limited by a global policy.  For small files it is customary to set the policy to parallel.  Large files are set to serial to ensure proper memory management. 

Some files should be backed up in pairs, e.g., dump.rdb and appendonly.aof.  For that condition their is a `group` policy with a group name.

### 2.4 Reporting

Reporting has three targets: 

1. logging to the rolling file logger with log levels set in the config file
2. the backup summary list report.  The summary report is in html and placed in the folder of a static web service (from configuration).
3. if there are any errors, the error summary report is sent to a list of email addresses, defined in the configuration file.

The html filename uses ISO8601 date/time format to produce backup-YYYY-MM-DDTHH:MM:SS.html and error-YYYY-MM-DDTHH:MM:SS.html for errors (only if there are errors).

## 3 Implementation

### 3.1 Application Startup

### 3.2 Configuration Process

### 3.3 Backup Process

### 3.4 Summary Reporting Process

## 6. Security Considerations

###### dpw | 2025.07.27
