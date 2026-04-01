import type { ThreadReadProjection } from '../ThreadReadProjection';
import type { ThreadId } from '../../queries/read-models/ids';
import type { ThreadReadModel } from '../../queries/read-models/ThreadReadModel';
import type { ThreadWithMessagesReadModel } from '../../queries/read-models/ThreadWithMessagesReadModel';

/**
 * ThreadReadProjectionImpl (Query-backed)
 *
 * Vincoli:
 * - Adapter puro: solo delega al Query Repository
 * - Nessuna logica/mapping/trasformazione dei dati
 * - Nessun import da persistence/api/prisma/domain
 */

// Tipo strutturale (non importa Query Port dal Core): evita dipendenze fuori da read-models.
export type ThreadQueryRepositoryForProjection = Readonly<{
  findAll(): Promise<ThreadReadModel[]>;
  findById(id: ThreadId): Promise<ThreadReadModel | null>;
  findThreadWithMessagesById(threadId: ThreadId): Promise<ThreadWithMessagesReadModel | null>;
}>;

export class ThreadReadProjectionImpl implements ThreadReadProjection {
  constructor(private readonly queryRepo: ThreadQueryRepositoryForProjection) {}

  async findAll(): Promise<ThreadReadModel[]> {
    return await this.queryRepo.findAll();
  }

  async getThreadById(id: ThreadId): Promise<ThreadReadModel | null> {
    return await this.queryRepo.findById(id);
  }

  async getThreadWithMessages(id: ThreadId): Promise<ThreadWithMessagesReadModel | null> {
    return await this.queryRepo.findThreadWithMessagesById(id);
  }

  async projectThreadWithMessages(threadId: ThreadId): Promise<ThreadWithMessagesReadModel | null> {
    return await this.getThreadWithMessages(threadId);
  }
}

