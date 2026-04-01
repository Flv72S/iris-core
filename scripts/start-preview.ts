#!/usr/bin/env node
/**
 * Preview Startup Script
 * 
 * Script di avvio dedicato per ambiente preview.
 * 
 * Responsabilità ESCLUSIVE:
 * - Validare presenza env minime
 * - Avviare main.ts
 * - Stampare a log: environment, persistence, porta
 * 
 * Vincoli:
 * - Nessuna logica applicativa
 * - Solo validazione e avvio
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP6A_Deployment_Preview_Map.md
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Verifica presenza variabili d'ambiente minime
 */
function validateMinimalEnv(): void {
  const required = ['HTTP_PORT'];
  const missing: string[] = [];

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'iris-api',
      component: 'bootstrap',
      correlationId: 'preview-startup',
      message: 'Missing required environment variables',
      context: { missing },
    }));
    process.exit(1);
  }
}

/**
 * Stampa informazioni di avvio
 */
function printStartupInfo(): void {
  const env = process.env.NODE_ENV || 'preview';
  const persistence = process.env.PERSISTENCE || 'memory';
  const port = process.env.HTTP_PORT || '3000';
  const logLevel = process.env.LOG_LEVEL || 'info';
  const sqlitePath = process.env.SQLITE_FILE_PATH;

  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    service: 'iris-api',
    component: 'bootstrap',
    correlationId: 'preview-startup',
    message: 'Starting IRIS preview environment',
    context: {
      environment: env,
      persistence,
      httpPort: parseInt(port, 10),
      logLevel,
      sqlitePath,
    },
  }));
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    // Valida env minime
    validateMinimalEnv();

    // Stampa info startup
    printStartupInfo();

    // Avvia applicazione principale
    // Import del modulo main.ts che esegue automaticamente
    await import('../src/app/main.js');
  } catch (error) {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'iris-api',
      component: 'bootstrap',
      correlationId: 'preview-startup',
      message: 'Failed to start preview environment',
      context: {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    }));
    process.exit(1);
  }
}

// Esegue solo se chiamato direttamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'iris-api',
      component: 'bootstrap',
      correlationId: 'preview-startup-fatal',
      message: 'Unhandled error in preview startup',
      context: {
        error: error instanceof Error ? error.message : String(error),
      },
    }));
    process.exit(1);
  });
}
