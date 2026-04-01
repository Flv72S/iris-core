/**
 * Startup Invariants
 * 
 * Invarianti di avvio che devono essere soddisfatti prima di procedere.
 * 
 * Responsabilità ESCLUSIVE:
 * - Verificare invarianti di avvio
 * - Abortire immediatamente se violati
 * - Nessuna logica applicativa
 * 
 * Vincoli:
 * - Violazione → abort immediato
 * - Errori dichiarativi
 * - Nessun fallback silenzioso
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9B_Runtime_Safety_Map.md
 * - IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md (H-16, H-17)
 */

import type { AppConfig } from '../../app/bootstrap/types';
import { getLogger } from '../../observability/logger';
import { generateCorrelationId } from '../../observability/correlation';

/**
 * Errore invariante startup violato
 */
export class StartupInvariantViolation extends Error {
  constructor(
    public readonly invariant: string,
    public readonly reason: string
  ) {
    super(`Startup invariant violated: ${invariant} - ${reason}`);
    this.name = 'StartupInvariantViolation';
  }
}

/**
 * Verifica invarianti di avvio
 * 
 * @param config Configurazione applicazione
 * @throws StartupInvariantViolation se invariante violato
 */
export function verifyStartupInvariants(config: AppConfig): void {
  const logger = getLogger();
  const correlationId = generateCorrelationId();

  // Invariante 1: Config valida (già validata, ma verifichiamo struttura)
  if (!config) {
    logger.error('bootstrap', correlationId, 'Startup invariant violated: config missing');
    throw new StartupInvariantViolation('CONFIG_PRESENT', 'Config must be present');
  }

  if (!config.http || typeof config.http.port !== 'number') {
    logger.error('bootstrap', correlationId, 'Startup invariant violated: http config invalid');
    throw new StartupInvariantViolation('HTTP_CONFIG_VALID', 'HTTP config must be valid');
  }

  // Invariante 2: Logger operativo
  try {
    logger.info('bootstrap', correlationId, 'Startup invariant check: logger operational');
  } catch (error) {
    logger.error('bootstrap', correlationId, 'Startup invariant violated: logger not operational', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw new StartupInvariantViolation('LOGGER_OPERATIONAL', 'Logger must be operational');
  }

  // Invariante 3: Persistence config coerente
  if (config.persistence === 'sqlite' && !config.sqlite) {
    logger.error('bootstrap', correlationId, 'Startup invariant violated: sqlite config missing');
    throw new StartupInvariantViolation(
      'PERSISTENCE_CONFIG_COHERENT',
      'SQLite persistence requires sqlite config'
    );
  }

  logger.info('bootstrap', correlationId, 'All startup invariants verified');
}
