#!/usr/bin/env bun
import { spawn } from "bun";

async function runBackup() {
  try {
    console.log("Starting backup...");
    
    const proc = spawn([
      "dotenvx", 
      "run", 
      "--", 
      "node", 
      "--no-deprecation", 
      "--import", 
      "./loader.mjs", 
      "dist/index.js", 
      "backup"
    ], {
      stdio: ["inherit", "inherit", "inherit"],
    });

    const exitCode = await proc.exited;
    
    if (exitCode === 0) {
      console.log("Backup completed successfully!");
    } else {
      console.error(`Backup failed with exit code: ${exitCode}`);
      process.exit(exitCode);
    }
  } catch (error) {
    console.error("Error running backup:", error);
    process.exit(1);
  }
}

runBackup();
