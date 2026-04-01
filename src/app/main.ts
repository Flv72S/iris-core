/**
 * Main Entrypoint
 * 
 * Punto di ingresso principale dell'applicazione IRIS.
 * 
 * Responsabilità ESCLUSIVE:
 * - Leggere env (process.env)
 * - Costruire AppConfig
 * - Chiamare createApp
 * - Avviare il server HTTP
 * 
 * Vincoli:
 * - main.ts è l'UNICO file autorizzato a leggere process.env
 * - Nessuna logica applicativa
 * - Solo wiring e avvio
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.8_Bootstrap_Map.md
 */

import { createApp, type AppConfig } from './bootstrap/AppBootstrap';
import { initializeLogger, getLogger } from '../observability/logger';
import { generateCorrelationId } from '../observability/correlation';
import { validateAndNormalizeConfig } from '../runtime/config/validateConfig';
import { setupShutdownHandlers, type ShutdownHandler } from '../runtime/shutdown/gracefulShutdown';
import { setReadinessState } from '../api/http/routes/health';
import { getPreviewConfigFromEnv, validatePreviewConfig } from '../api/http/middleware/previewConfig';

/**
 * Legge e valida configurazione da variabili d'ambiente
 * 
 * @returns AppConfig validata
 * @throws ConfigValidationError se configurazione invalida
 */
function readConfigFromEnv(): AppConfig {
  const persistence = (process.env.PERSISTENCE || 'memory') as 'memory' | 'sqlite';
  const httpPort = parseInt(process.env.HTTP_PORT || '3000', 10);
  const sqliteFilePath = process.env.SQLITE_FILE_PATH || ':memory:';
  
  // Valida e normalizza config (fail-fast)
  return validateAndNormalizeConfig({
    persistence,
    httpPort,
    sqliteFilePath,
  });
}

/**
 * Avvia applicazione
 */
async function main(): Promise<void> {
  // Inizializza logger strutturato (legge LOG_LEVEL da env)
  const logLevel = (process.env.LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error';
  initializeLogger(logLevel);
  const logger = getLogger();
  const correlationId = generateCorrelationId();
  
  try {
    // Legge configurazione da env
    const config = readConfigFromEnv();
    
    // Valida preview config (fail-fast se PREVIEW_MODE=true e token mancante)
    const previewConfig = getPreviewConfigFromEnv();
    validatePreviewConfig(previewConfig);
    
    logger.info('bootstrap', correlationId, 'Starting IRIS application', {
      persistence: config.persistence,
      httpPort: config.http.port,
      sqlitePath: config.sqlite?.filePath,
    });
    
    // Crea applicazione
    const app = createApp(config);
    
    // Imposta readiness state (inizialmente not ready)
    setReadinessState({
      ready: false,
      persistence: {
        initialized: false,
        type: config.persistence,
      },
      boundary: {
        operational: false,
      },
    });
    
    // Avvia server HTTP
    await app.httpServer.start(config.http.port);
    
    // Imposta readiness state (sistema operativo)
    setReadinessState({
      ready: true,
      persistence: {
        initialized: true,
        type: config.persistence,
      },
      boundary: {
        operational: true,
      },
    });
    
    logger.info('bootstrap', correlationId, 'IRIS application started', {
      port: config.http.port,
    });
    
    // Setup graceful shutdown handlers (H-08)
    const shutdownHandlers: ShutdownHandler[] = [
      {
        name: 'http-server',
        shutdown: async () => {
          await app.httpServer.stop();
        },
      },
      {
        name: 'boundary',
        shutdown: async () => {
          // Boundary non ha shutdown esplicito, ma possiamo loggare
          logger.info('bootstrap', correlationId, 'Boundary shutdown (no-op)');
        },
      },
      {
        name: 'persistence',
        shutdown: async () => {
          await app.shutdown();
        },
      },
    ];
    
    // Legge shutdown timeout da env (default: 10s)
    const shutdownTimeoutMs = parseInt(process.env.SHUTDOWN_TIMEOUT_MS || '10000', 10);
    
    setupShutdownHandlers(shutdownHandlers, {
      timeoutMs: shutdownTimeoutMs,
    });
  } catch (error) {
    logger.error('bootstrap', correlationId, 'Failed to start IRIS application', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

// Avvia applicazione
main().catch((error) => {
  // Fallback logger se main() fallisce prima di inizializzare logger
  const correlationId = 'bootstrap-fatal';
  try {
    const logger = getLogger();
    logger.error('bootstrap', correlationId, 'Unhandled error in main', {
      error: error instanceof Error ? error.message : String(error),
    });
  } catch {
    // Se anche il logger fallisce, usa console.error come ultimo fallback
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      service: 'iris-api',
      component: 'bootstrap',
      correlationId,
      message: 'Unhandled error in main',
      context: { error: error instanceof Error ? error.message : String(error) },
    }));
  }
  process.exit(1);
});
