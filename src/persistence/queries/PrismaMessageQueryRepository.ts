import type { PrismaClient } from '@prisma/client';
import type { MessageQueryRepository } from '../../core/queries/MessageQueryRepository';
import type { MessageId, ThreadId } from '../../core/queries/read-models/ids';
import type { MessageReadModel } from '../../core/queries/read-models/MessageReadModel';
import type { MessageWithThreadReadModel } from '../../core/queries/read-models/MessageWithThreadReadModel';
import { getMessagesPrismaClient } from '../messages/prisma/client';
import { getQueriesPrismaClient } from './prismaQueriesClient';

type PrismaMessageRow = {
  readonly id: string;
  readonly threadId: string;
  readonly author: string;
  readonly content: string;
  readonly createdAt: Date;
};

export class PrismaMessageQueryRepository implements MessageQueryRepository {
  constructor(
    private readonly databaseUrl: string,
    private readonly clientForQueries?: PrismaClient
  ) {}

  async findByThreadId(threadId: ThreadId): Promise<MessageReadModel[]> {
    const prisma = await getMessagesPrismaClient(this.databaseUrl);
    const rows = (await (prisma as any).message.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    })) as PrismaMessageRow[];

    return rows.map((r) => this.rowToReadModel(r));
  }

  async findById(id: MessageId): Promise<MessageReadModel | null> {
    const prisma = await getMessagesPrismaClient(this.databaseUrl);
    const row = (await (prisma as any).message.findUnique({
      where: { id },
    })) as PrismaMessageRow | null;

    if (!row) return null;
    return this.rowToReadModel(row);
  }

  /**
   * Restituisce Message + Thread in un unico Read Model denormalizzato.
   * Una sola query Prisma (include); un solo round-trip DB.
   */
  async findMessageWithThreadById(messageId: MessageId): Promise<MessageWithThreadReadModel | null> {
    const prisma = this.clientForQueries ?? (await getQueriesPrismaClient(this.databaseUrl));
    const row = await prisma.message.findUnique({
      where: { id: messageId },
      include: { thread: true },
    });
    if (!row || !row.thread) return null;
    return {
      id: row.id,
      content: row.content,
      author: row.author,
      createdAt: row.createdAt.toISOString(),
      thread: {
        id: row.thread.id,
        title: row.thread.title,
        archived: row.thread.archived,
      },
    };
  }

  private rowToReadModel(row: PrismaMessageRow): MessageReadModel {
    return {
      id: row.id,
      threadId: row.threadId,
      author: row.author,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

