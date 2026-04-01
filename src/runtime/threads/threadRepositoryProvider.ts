/**
 * ThreadRepositoryProvider (Composition Root)
 *
 * Responsabilità:
 * - Seleziona l'implementazione di ThreadRepository in base all'ambiente
 * - Mantiene una sola istanza per processo
 *
 * Regole (vincolanti):
 * - Nessuna logica applicativa / business
 * - Core NON importa questo modulo
 * - HTTP NON deve importare Prisma/InMemory direttamente (solo ThreadRepository)
 *
 * Selezione:
 * - NODE_ENV === 'test'  -> InMemoryThreadRepository
 * - default              -> PrismaThreadRepository
 */

import type { ThreadRepository } from '../../core/threads/ThreadRepository';
import { InMemoryThreadRepository } from '../../api/http/repositories/InMemoryThreadRepository';
import { createRequire } from 'module';

let singleton: ThreadRepository | null = null;

function isTestEnv(): boolean {
  return process.env.NODE_ENV === 'test';
}

export function getThreadRepository(): ThreadRepository {
  if (singleton) return singleton;

  if (isTestEnv()) {
    singleton = new InMemoryThreadRepository();
    return singleton;
  }

  // NOTE: SQLite in-memory condiviso per mantenere comportamento invariato (nessuna persistenza tra restart).
  // Caricamento lazy di Prisma per evitare costi/side-effect durante i test che importano l'HTTP server.
  const require = createRequire(import.meta.url);
  const { PrismaThreadRepository } = require('../../persistence/threads/PrismaThreadRepository') as {
    PrismaThreadRepository: new (databaseUrl: string) => ThreadRepository;
  };
  singleton = new PrismaThreadRepository('file:iris-threads?mode=memory&cache=shared');
  return singleton;
}

