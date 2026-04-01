/**
 * Prisma Client (Threads persistence)
 *
 * Vincoli:
 * - Usato solo dal repository persistence (non direttamente dai test)
 * - No accesso a env/process/fs: il databaseUrl è passato esplicitamente
 * - Singleton per databaseUrl (un client per URL)
 */

import { PrismaClient } from '@prisma/client';

type ClientEntry = {
  readonly client: PrismaClient;
  initialized: boolean;
};

const clientsByUrl = new Map<string, ClientEntry>();

async function ensureThreadSchema(client: PrismaClient): Promise<void> {
  // Schema minimale coerente con schema.prisma (tabella "Thread", nessuna relazione).
  // DDL eseguito via Prisma per evitare CLI/migrations in questo microstep.
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Thread" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "title" TEXT NOT NULL,
      "archived" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    );
  `);
}

export async function getThreadsPrismaClient(databaseUrl: string): Promise<PrismaClient> {
  const existing = clientsByUrl.get(databaseUrl);
  if (existing) {
    if (!existing.initialized) {
      await ensureThreadSchema(existing.client);
      existing.initialized = true;
    }
    return existing.client;
  }

  const client = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  });

  const entry: ClientEntry = { client, initialized: false };
  clientsByUrl.set(databaseUrl, entry);

  await ensureThreadSchema(client);
  entry.initialized = true;

  return client;
}

export async function disconnectThreadsPrismaClient(databaseUrl: string): Promise<void> {
  const entry = clientsByUrl.get(databaseUrl);
  if (!entry) return;
  await entry.client.$disconnect();
  clientsByUrl.delete(databaseUrl);
}

