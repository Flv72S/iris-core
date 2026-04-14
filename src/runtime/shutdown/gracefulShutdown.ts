/**
 * Graceful Shutdown
 * 
 * Gestione shutdown controllato con timeout.
 * 
 * Responsabilità ESCLUSIVE:
 * - Intercettare SIGINT/SIGTERM
 * - Eseguire shutdown in ordine determinato
 * - Applicare timeout esplicito
 * - Nessuna logica applicativa
 * 
 * Vincoli:
 * - Ordine di chiusura: HTTP server → Boundary → Repository/DB
 * - Timeout configurabile
 * - Se timeout superato → exit forzata controllata
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9B_Runtime_Safety_Map.md
 * - IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md (H-08)
 */

import { getLogger } from '../../observability/logger';
import { generateCorrelationId } from '../../observability/correlation';

/**
 * Configurazione shutdown
 */
export interface ShutdownConfig {
  readonly timeoutMs: number; // Timeout in millisecondi
}

/**
 * Handler di shutdown per componente
 */
export interface ShutdownHandler {
  readonly name: string;
  readonly shutdown: () => Promise<void>;
}

/**
 * Stato shutdown
 */
interface ShutdownState {
  inProgress: boolean;
  startTime: number | null;
}

let shutdownState: ShutdownState = {
  inProgress: false,
  startTime: null,
};

/**
 * Esegue shutdown graceful con timeout
 * 
 * @param handlers Handlers di shutdown in ordine di esecuzione
 * @param config Configurazione shutdown
 */
export async function gracefulShutdown(
  handlers: readonly ShutdownHandler[],
  config: ShutdownConfig
): Promise<void> {
  const logger = getLogger();
  const correlationId = generateCorrelationId();

  // Previene shutdown multipli
  if (shutdownState.inProgress) {
    logger.warn('bootstrap', correlationId, 'Shutdown already in progress, ignoring');
    return;
  }

  shutdownState.inProgress = true;
  shutdownState.startTime = Date.now();

  logger.info('bootstrap', correlationId, 'Starting graceful shutdown', {
    timeoutMs: config.timeoutMs,
    handlers: handlers.map(h => h.name),
  });

  // Timeout promise
  const timeoutPromise = new Promise<void>((resolve) => {
    setTimeout(() => {
      logger.error('bootstrap', correlationId, 'Shutdown timeout exceeded, forcing exit', {
        timeoutMs: config.timeoutMs,
      });
      resolve();
    }, config.timeoutMs);
  });

  // Shutdown promise
  const shutdownPromise = (async () => {
    try {
      // Esegue shutdown in ordine
      for (const handler of handlers) {
        logger.info('bootstrap', correlationId, `Shutting down: ${handler.name}`);
        try {
          await handler.shutdown();
          logger.info('bootstrap', correlationId, `Shutdown completed: ${handler.name}`);
        } catch (error) {
          logger.error('bootstrap', correlationId, `Shutdown failed for: ${handler.name}`, {
            error: error instanceof Error ? error.message : String(error),
          });
          // Continua con altri handler anche se uno fallisce
        }
      }

      const duration = Date.now() - (shutdownState.startTime || 0);
      logger.info('bootstrap', correlationId, 'Graceful shutdown completed', {
        durationMs: duration,
      });
    } catch (error) {
      logger.error('bootstrap', correlationId, 'Graceful shutdown error', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  })();

  // Attende shutdown o timeout (quello che arriva prima)
  await Promise.race([shutdownPromise, timeoutPromise]);

  // Se timeout è scaduto, forza exit
  if (Date.now() - (shutdownState.startTime || 0) >= config.timeoutMs) {
    logger.error('bootstrap', correlationId, 'Shutdown timeout, forcing exit');
    process.exit(1);
  }
}

/**
 * Setup signal handlers per shutdown graceful
 * 
 * @param handlers Handlers di shutdown
 * @param config Configurazione shutdown
 */
export function setupShutdownHandlers(
  handlers: readonly ShutdownHandler[],
  config: ShutdownConfig
): void {
  const logger = getLogger();
  const correlationId = generateCorrelationId();

  const shutdown = async (signal: string) => {
    logger.info('bootstrap', correlationId, `Received ${signal}, initiating graceful shutdown`);
    await gracefulShutdown(handlers, config);
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  logger.info('bootstrap', correlationId, 'Shutdown signal handlers registered', {
    signals: ['SIGINT', 'SIGTERM'],
  });
}
