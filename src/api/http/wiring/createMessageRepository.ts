import { createRequire } from 'module';

export type MessageRepositoryPort = import('../../../core/messages/MessageRepository').MessageRepository;
export type ThreadRepositoryPort = import('../../../core/threads/ThreadRepository').ThreadRepository;

export type CreateMessageRepositoryOptions = Readonly<{
  /**
   * Flag runtime esplicito (testabile).
   * Precedence: env MESSAGE_REPOSITORY vince sul flag.
   */
  usePrisma?: boolean;

  /**
   * ThreadRepository già selezionato dal wiring (da riusare, non duplicare).
   */
  threadRepository?: ThreadRepositoryPort;
}>;

function resolveSelection(options?: CreateMessageRepositoryOptions): 'prisma' | 'memory' {
  // 3️⃣ Env (produzione) — precedence più alta
  const envValue = process.env.MESSAGE_REPOSITORY;
  if (envValue === 'prisma') return 'prisma';

  // 2️⃣ Flag (runtime, testabile)
  if (options?.usePrisma === true) return 'prisma';

  // 1️⃣ Hardcoded fallback sicuro (default deterministico)
  return 'memory';
}

/**
 * Factory unica per scegliere l'implementazione di MessageRepository.
 *
 * Vincoli:
 * - Default deterministico: InMemory (persistence layer)
 * - Prisma selezionabile via flag o env
 * - Nessun import Prisma nei route handler (solo qui, wiring)
 */
export function createMessageRepository(options?: CreateMessageRepositoryOptions): MessageRepositoryPort {
  const selection = resolveSelection(options);
  const require = createRequire(import.meta.url);

  const { ConsistentMessageRepository } = require('./ConsistentMessageRepository') as typeof import('./ConsistentMessageRepository');
  const threadRepository =
    options?.threadRepository ??
    ((require('../../../runtime/threads/threadRepositoryProvider') as { getThreadRepository: () => unknown }).getThreadRepository() as ThreadRepositoryPort);

  if (selection === 'prisma') {
    const { PrismaMessageRepository } = require('../../../persistence/messages/PrismaMessageRepository') as {
      PrismaMessageRepository: new (databaseUrl: string) => MessageRepositoryPort;
    };

    // SQLite in-memory condiviso per comportamento deterministico e senza FS.
    const repo = new PrismaMessageRepository('file:iris-messages?mode=memory&cache=shared');
    return new ConsistentMessageRepository(repo, threadRepository);
  }

  const { InMemoryMessageRepository } = require('../../../persistence/messages/InMemoryMessageRepository') as {
    InMemoryMessageRepository: new () => MessageRepositoryPort;
  };
  const repo = new InMemoryMessageRepository();
  return new ConsistentMessageRepository(repo, threadRepository);
}

