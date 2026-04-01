/**
 * PrismaThreadRepository (Persistence Adapter)
 *
 * Vincoli:
 * - Implementa ESATTAMENTE `ThreadRepository` (Core)
 * - Nessuna logica di business (solo storage)
 * - SQLite + Prisma Client
 * - Upsert semantico su save()
 * - deleteById idempotente
 */

import type { ThreadRepository } from '../../core/threads/ThreadRepository';
import { Thread } from '../../core/threads/Thread';
import { getThreadsPrismaClient, disconnectThreadsPrismaClient } from './prisma/client';

type PrismaThreadRow = {
  readonly id: string;
  readonly title: string;
  readonly archived: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};

export class PrismaThreadRepository implements ThreadRepository {
  constructor(private readonly databaseUrl: string) {}

  async save(thread: Thread): Promise<void> {
    const prisma = await getThreadsPrismaClient(this.databaseUrl);

    await prisma.thread.upsert({
      where: { id: thread.getId() },
      create: {
        id: thread.getId(),
        title: thread.getTitle(),
        archived: thread.isArchived(),
        createdAt: thread.getCreatedAt(),
        updatedAt: thread.getUpdatedAt(),
      },
      update: {
        title: thread.getTitle(),
        archived: thread.isArchived(),
        updatedAt: thread.getUpdatedAt(),
      },
    });
  }

  async findById(id: string): Promise<Thread | null> {
    const prisma = await getThreadsPrismaClient(this.databaseUrl);

    const row = (await prisma.thread.findUnique({
      where: { id },
    })) as PrismaThreadRow | null;

    if (!row) return null;
    return this.rowToEntity(row);
  }

  async findAll(): Promise<Thread[]> {
    const prisma = await getThreadsPrismaClient(this.databaseUrl);

    const rows = (await prisma.thread.findMany()) as PrismaThreadRow[];
    return rows.map((r) => this.rowToEntity(r));
  }

  async deleteById(id: string): Promise<void> {
    const prisma = await getThreadsPrismaClient(this.databaseUrl);
    // Idempotente: deleteMany non throw se record non esiste.
    await prisma.thread.deleteMany({ where: { id } });
  }

  async close(): Promise<void> {
    await disconnectThreadsPrismaClient(this.databaseUrl);
  }

  private rowToEntity(row: PrismaThreadRow): Thread {
    // NOTE: il costruttore di Thread è private, ma a runtime è invocabile.
    // Questo permette un' "hydrate" senza mutare campi interni e senza cambiare il Core.
    // Invarianti vengono comunque applicate dal costruttore.
    return new (Thread as any)({
      id: row.id,
      title: row.title,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      isArchived: row.archived,
    }) as Thread;
  }
}

