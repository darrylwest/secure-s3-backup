// src/ConfigManager.ts
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import toml from 'toml';

const jobSchema = z.object({
  name: z.string(),
  path: z.string(),
  s3KeyPrefix: z.string(),
  policy: z.object({
    retentionCount: z.number().int().positive(),
    frequency: z.enum(['daily', 'hourly', 'on-change-only']),
  }),
});

const configSchema = z.object({
  s3: z.object({
    bucket: z.string(),
  }),
  reporting: z.object({
    htmlPath: z.string(),
    errorRecipients: z.array(z.string().email()),
  }),
  jobs: z.array(jobSchema),
});

export type Config = z.infer<typeof configSchema>;

export class ConfigManager {
  private config: Config | null = null;

  constructor(private readonly configPath?: string) {}

  public getConfig(): Config {
    if (this.config) {
      return this.config;
    }

    const resolvedPath = this.resolveConfigPath();
    const rawConfig = fs.readFileSync(resolvedPath, 'utf-8');
    
    let parsedConfig: any;
    if (resolvedPath.endsWith('.toml')) {
        parsedConfig = toml.parse(rawConfig);
    } else {
        parsedConfig = JSON.parse(rawConfig);
    }

    this.config = configSchema.parse(parsedConfig);
    return this.config;
  }

  private resolveConfigPath(): string {
    if (this.configPath) {
      return path.resolve(this.configPath);
    }

    const home = process.env.HOME;
    if (!home) {
      throw new Error('HOME environment variable not set.');
    }

    const defaultConfigPath = path.join(
      home,
      '.config',
      'secure-s3-backup',
      'config.json',
    );
    
    const defaultTomlPath = path.join(
        home,
        '.config',
        'secure-s3-backup',
        'config.toml',
      );

    if (fs.existsSync(defaultConfigPath)) {
      return defaultConfigPath;
    }
    
    if (fs.existsSync(defaultTomlPath)) {
        return defaultTomlPath;
    }

    throw new Error('Configuration file not found.');
  }
}
