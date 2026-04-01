import type { PrismaClient } from '@prisma/client';
import type { ThreadQueryRepository } from '../../core/queries/ThreadQueryRepository';
import type { ThreadId } from '../../core/queries/read-models/ids';
import type { ThreadReadModel } from '../../core/queries/read-models/ThreadReadModel';
import type { ThreadWithMessagesReadModel } from '../../core/queries/read-models/ThreadWithMessagesReadModel';
import { getQueriesPrismaClient } from './prismaQueriesClient';
import { getThreadsPrismaClient } from '../threads/prisma/client';

type PrismaThreadRow = {
  readonly id: string;
  readonly title: string;
  readonly archived: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class PrismaThreadQueryRepository implements ThreadQueryRepository {
  constructor(
    private readonly databaseUrl: string,
    private readonly clientForQueries?: PrismaClient
  ) {}

  async findAll(): Promise<ThreadReadModel[]> {
    const prisma = await getThreadsPrismaClient(this.databaseUrl);
    const rows = (await prisma.thread.findMany({
      orderBy: { createdAt: 'asc' },
    })) as PrismaThreadRow[];

    return rows.map((r) => this.rowToReadModel(r));
  }

  async findById(id: ThreadId): Promise<ThreadReadModel | null> {
    const prisma = await getThreadsPrismaClient(this.databaseUrl);
    const row = (await prisma.thread.findUnique({
      where: { id },
    })) as PrismaThreadRow | null;

    if (!row) return null;
    return this.rowToReadModel(row);
  }

  /**
   * Restituisce Thread + Messages in un unico Read Model denormalizzato.
   * Una sola query Prisma (include); un solo round-trip DB.
   */
  async findThreadWithMessagesById(threadId: ThreadId): Promise<ThreadWithMessagesReadModel | null> {
    const prisma = this.clientForQueries ?? (await getQueriesPrismaClient(this.databaseUrl));
    const row = await prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        messages: { orderBy: { createdAt: 'asc' as const } },
      },
    });
    if (!row) return null;
    return {
      ...this.rowToReadModel(row as PrismaThreadRow),
      messages: row.messages.map((m) => ({
        id: m.id,
        author: m.author,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
  }

  private rowToReadModel(row: PrismaThreadRow): ThreadReadModel {
    return {
      id: row.id,
      title: row.title,
      archived: row.archived,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

