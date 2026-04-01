/**
 * PrismaMessageRepository (Persistence Adapter)
 *
 * Vincoli:
 * - Implementa ESATTAMENTE `MessageRepository` (Core)
 * - Nessuna logica di business (solo storage)
 * - SQLite + Prisma Client
 * - save: create
 * - findById: findUnique -> null se non trovato
 * - findByThreadId: findMany (ordine di inserimento del DB)
 */

import type { MessageRepository } from '../../core/messages/MessageRepository';
import { Message } from '../../core/messages/Message';
import type { MessageId, ThreadId } from '../../core/messages/ids';
import { getMessagesPrismaClient, disconnectMessagesPrismaClient } from './prisma/client';

type PrismaMessageRow = {
  readonly id: string;
  readonly threadId: string;
  readonly author: string;
  readonly content: string;
  readonly createdAt: Date;
};

export class PrismaMessageRepository implements MessageRepository {
  constructor(private readonly databaseUrl: string) {}

  async save(message: Message): Promise<void> {
    const prisma = await getMessagesPrismaClient(this.databaseUrl);

    await (prisma as any).message.create({
      data: {
        id: message.id,
        threadId: message.threadId,
        author: message.author,
        content: message.content,
        createdAt: message.createdAt,
      },
    });
  }

  async findByThreadId(threadId: ThreadId): Promise<Message[]> {
    const prisma = await getMessagesPrismaClient(this.databaseUrl);

    const rows = (await (prisma as any).message.findMany({
      where: { threadId },
    })) as PrismaMessageRow[];

    return rows.map((r) => this.rowToEntity(r));
  }

  async findById(id: MessageId): Promise<Message | null> {
    const prisma = await getMessagesPrismaClient(this.databaseUrl);

    const row = (await (prisma as any).message.findUnique({
      where: { id },
    })) as PrismaMessageRow | null;

    if (!row) return null;
    return this.rowToEntity(row);
  }

  async close(): Promise<void> {
    await disconnectMessagesPrismaClient(this.databaseUrl);
  }

  private rowToEntity(row: PrismaMessageRow): Message {
    return new Message({
      id: row.id,
      threadId: row.threadId,
      author: row.author,
      content: row.content,
      createdAt: row.createdAt,
    });
  }
}

