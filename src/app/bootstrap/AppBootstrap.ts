/**
 * App Bootstrap
 * 
 * Composition Root per l'applicazione IRIS.
 * 
 * Responsabilità ESCLUSIVE:
 * - Comporre Core, Boundary, Repository, Transport
 * - Consentire swap runtime deterministico (InMemory ↔ SQLite)
 * - NON introdurre semantica
 * - NON modificare Core o Boundary
 * 
 * Vincoli:
 * - Un solo Composition Root
 * - Zero semantica
 * - Core e Boundary invariati
 * - Testabile
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.8_Bootstrap_Map.md
 */

import type { AppConfig } from './types';
import { createRepositories } from './PersistenceFactory';
import { createHttpServerBundle } from './HttpServerFactory';
import { MessagingBoundary } from '../../api/boundary/MessagingBoundary';
import { closeDatabase } from '../../api/repositories/sqlite';
import type Database from 'better-sqlite3';
import type { SqliteRepositoryBundle } from './PersistenceFactory';
import { validateConfig } from '../../runtime/config/validateConfig';
import { verifyStartupInvariants } from '../../runtime/startup/startupInvariants';

/**
 * App instance
 * 
 * Contiene tutti i componenti dell'applicazione e funzioni di controllo.
 */
export interface App {
  readonly boundary: MessagingBoundary;
  readonly httpServer: {
    readonly server: any; // FastifyInstance
    readonly start: (port: number) => Promise<void>;
    readonly stop: () => Promise<void>;
  };
  readonly shutdown: () => Promise<void>;
}

/**
 * Crea applicazione completa
 * 
 * Questa funzione:
 * 1. Valida la config (strutturalmente, non semanticamente)
 * 2. Istanzia persistence
 * 3. Istanzia boundary
 * 4. Istanzia transport
 * 5. Restituisce App con shutdown
 * 
 * @param config AppConfig
 * @returns App
 */
export function createApp(config: AppConfig): App {
  // Validazione fail-fast (H-05)
  validateConfig(config);
  
  // Verifica startup invariants (H-16, H-17)
  verifyStartupInvariants(config);
  
  // 1. Istanzia persistence
  const repositories = createRepositories(config);
  
  // 2. Istanzia boundary
  const boundary = new MessagingBoundary(
    repositories.messageRepository,
    repositories.threadRepository,
    repositories.aliasRepository,
    repositories.rateLimitRepository,
    repositories.offlineQueueRepository,
    repositories.syncStatusRepository
  );
  
  // 3. Istanzia transport
  const httpServer = createHttpServerBundle(boundary);
  
  // 4. Shutdown function
  const shutdown = async (): Promise<void> => {
    // Ferma server HTTP
    await httpServer.stop();
    
    // Chiude database SQLite (se presente)
    if ('db' in repositories) {
      const sqliteBundle = repositories as SqliteRepositoryBundle;
      closeDatabase(sqliteBundle.db);
    }
  };
  
  return {
    boundary,
    httpServer,
    shutdown,
  };
}

// Validazione config ora gestita da src/runtime/config/validateConfig.ts
// e src/runtime/startup/startupInvariants.ts
