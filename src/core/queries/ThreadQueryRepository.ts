import type { ThreadId } from './read-models/ids';
import type { ThreadReadModel } from './read-models/ThreadReadModel';

/**
 * ThreadQueryRepository (Query Port)
 *
 * Vincoli:
 * - Read-only
 * - Ritorna DTO (ReadModel), non entità di dominio
 * - Nessuna implementazione concreta in Core
 */
export interface ThreadQueryRepository {
  findAll(): Promise<ThreadReadModel[]>;
  findById(id: ThreadId): Promise<ThreadReadModel | null>;
}

