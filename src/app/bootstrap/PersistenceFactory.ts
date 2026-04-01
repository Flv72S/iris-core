/**
 * Persistence Factory
 * 
 * Factory per creare repository in base alla configurazione.
 * 
 * Responsabilità ESCLUSIVE:
 * - Leggere AppConfig.persistence
 * - Istanzia repository (InMemory o SQLite)
 * - Restituire oggetto tipizzato con tutti i repository
 * 
 * Vincoli:
 * - Nessuna importazione da Core
 * - Nessuna logica decisionale oltre allo switch
 * - SQLite e InMemory devono essere intercambiabili
 * 
 * Riferimenti vincolanti:
 * - IRIS_STEP5.8_Bootstrap_Map.md
 */

import type { AppConfig } from './types';
import type {
  MessageRepository,
  ThreadRepository,
  SyncStatusRepository,
  OfflineQueueRepository,
  RateLimitRepository,
  AliasRepository,
} from '../../api/repositories';
import {
  InMemoryMessageRepository,
  InMemoryThreadRepository,
  InMemorySyncStatusRepository,
  InMemoryOfflineQueueRepository,
  InMemoryRateLimitRepository,
  InMemoryAliasRepository,
} from '../../api/repositories/memory';
import {
  createDatabase,
  SQLiteMessageRepository,
  SQLiteThreadRepository,
  SQLiteSyncStatusRepository,
  SQLiteOfflineQueueRepository,
  SQLiteRateLimitRepository,
  SQLiteAliasRepository,
} from '../../api/repositories/sqlite';
import type Database from 'better-sqlite3';

/**
 * Repository bundle
 * 
 * Contiene tutti i repository necessari per il Boundary.
 */
export interface RepositoryBundle {
  readonly messageRepository: MessageRepository;
  readonly threadRepository: ThreadRepository;
  readonly syncStatusRepository: SyncStatusRepository;
  readonly offlineQueueRepository: OfflineQueueRepository;
  readonly rateLimitRepository: RateLimitRepository;
  readonly aliasRepository: AliasRepository;
}

/**
 * Repository bundle con database SQLite (per cleanup)
 */
export interface SqliteRepositoryBundle extends RepositoryBundle {
  readonly db: Database.Database;
}

/**
 * Crea repository bundle in base alla configurazione
 * 
 * @param config AppConfig
 * @returns RepositoryBundle
 */
export function createRepositories(config: AppConfig): RepositoryBundle | SqliteRepositoryBundle {
  switch (config.persistence) {
    case 'memory':
      return createMemoryRepositories();
    
    case 'sqlite':
      if (!config.sqlite) {
        throw new Error('sqlite config is required when persistence is "sqlite"');
      }
      return createSqliteRepositories(config.sqlite.filePath);
    
    default:
      throw new Error(`Unknown persistence type: ${config.persistence}`);
  }
}

/**
 * Crea repository in-memory
 */
function createMemoryRepositories(): RepositoryBundle {
  return {
    messageRepository: new InMemoryMessageRepository(),
    threadRepository: new InMemoryThreadRepository(),
    syncStatusRepository: new InMemorySyncStatusRepository(),
    offlineQueueRepository: new InMemoryOfflineQueueRepository(),
    rateLimitRepository: new InMemoryRateLimitRepository(),
    aliasRepository: new InMemoryAliasRepository(),
  };
}

/**
 * Crea repository SQLite
 */
function createSqliteRepositories(filePath: string): SqliteRepositoryBundle {
  const db = createDatabase(filePath);
  
  return {
    db,
    messageRepository: new SQLiteMessageRepository(db),
    threadRepository: new SQLiteThreadRepository(db),
    syncStatusRepository: new SQLiteSyncStatusRepository(db),
    offlineQueueRepository: new SQLiteOfflineQueueRepository(db),
    rateLimitRepository: new SQLiteRateLimitRepository(db),
    aliasRepository: new SQLiteAliasRepository(db),
  };
}
