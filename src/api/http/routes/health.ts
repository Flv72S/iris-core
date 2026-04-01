/**
 * Health & Readiness Routes
 * 
 * Endpoint per health check e readiness check.
 * 
 * Responsabilità ESCLUSIVE:
 * - /health → liveness (process alive)
 * - /ready → readiness operativa
 * - Nessuna logica applicativa
 * 
 * Vincoli:
 * - /health ritorna 200 se processo attivo
 * - /ready ritorna 200 solo se sistema operativo
 * - Nessuna logica implicita
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.9B_Runtime_Safety_Map.md
 * - IRIS_STEP5.9_MVP_Hardening_Checklist_and_Results.md (H-04)
 */

import type { FastifyInstance } from 'fastify';
import type { MessagingBoundary } from '../../boundary/MessagingBoundary';

/**
 * Stato readiness
 */
export interface ReadinessState {
  readonly ready: boolean;
  readonly persistence: {
    readonly initialized: boolean;
    readonly type: 'memory' | 'sqlite' | 'unknown';
  };
  readonly boundary: {
    readonly operational: boolean;
  };
  readonly errors?: readonly string[];
}

/**
 * Stato readiness globale (mantenuto esplicitamente)
 */
let readinessState: ReadinessState = {
  ready: false,
  persistence: {
    initialized: false,
    type: 'unknown',
  },
  boundary: {
    operational: false,
  },
};

/**
 * Imposta stato readiness
 */
export function setReadinessState(state: ReadinessState): void {
  readinessState = state;
}

/**
 * Ottiene stato readiness
 */
export function getReadinessState(): ReadinessState {
  return readinessState;
}

/**
 * Verifica readiness operativa
 */
async function checkReadiness(boundary: MessagingBoundary): Promise<ReadinessState> {
  const errors: string[] = [];

  // Verifica persistence (tramite boundary)
  let persistenceInitialized = false;
  let persistenceType: 'memory' | 'sqlite' | 'unknown' = 'unknown';

  try {
    // Prova operazione leggera per verificare persistence
    // Usa un thread ID che non esiste per verificare che repository risponda
    await boundary.getThreadState('health-check-thread-id');
    persistenceInitialized = true;
    // Non possiamo determinare il tipo esatto senza accesso diretto ai repository
    // Ma se boundary risponde, persistence è operativa
    persistenceType = 'unknown'; // Tipo determinato dal bootstrap
  } catch (error) {
    // Se errore è THREAD_NOT_FOUND, repository funziona (è l'errore atteso)
    if (error && typeof error === 'object' && 'code' in error && error.code === 'THREAD_NOT_FOUND') {
      persistenceInitialized = true;
    } else {
      errors.push(`Persistence check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Verifica boundary operativo
  const boundaryOperational = true; // Boundary è sempre operativo se istanziato

  const ready = persistenceInitialized && boundaryOperational && errors.length === 0;

  return {
    ready,
    persistence: {
      initialized: persistenceInitialized,
      type: persistenceType,
    },
    boundary: {
      operational: boundaryOperational,
    },
    errors: errors.length > 0 ? errors : undefined,
  };
}

/**
 * Registra route health e readiness
 */
export function registerHealthRoutes(server: FastifyInstance, boundary: MessagingBoundary): void {
  // Health check (liveness)
  server.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Readiness check
  server.get('/ready', async (request, reply) => {
    const state = await checkReadiness(boundary);
    
    if (state.ready) {
      return reply.code(200).send({
        status: 'ready',
        timestamp: new Date().toISOString(),
        persistence: state.persistence,
        boundary: state.boundary,
      });
    } else {
      return reply.code(503).send({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        persistence: state.persistence,
        boundary: state.boundary,
        errors: state.errors,
      });
    }
  });
}
