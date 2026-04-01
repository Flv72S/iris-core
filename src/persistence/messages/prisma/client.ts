/**
 * Prisma Client (Messages persistence)
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

async function ensureMessageSchema(client: PrismaClient): Promise<void> {
  // Schema minimale coerente con prisma/schema.prisma (tabella "Message", nessuna relazione).
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Message" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "threadId" TEXT NOT NULL,
      "author" TEXT NOT NULL,
      "content" TEXT NOT NULL,
      "createdAt" DATETIME NOT NULL
    );
  `);
}

export async function getMessagesPrismaClient(databaseUrl: string): Promise<PrismaClient> {
  const existing = clientsByUrl.get(databaseUrl);
  if (existing) {
    if (!existing.initialized) {
      await ensureMessageSchema(existing.client);
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

  await ensureMessageSchema(client);
  entry.initialized = true;

  return client;
}

export async function disconnectMessagesPrismaClient(databaseUrl: string): Promise<void> {
  const entry = clientsByUrl.get(databaseUrl);
  if (!entry) return;
  await entry.client.$disconnect();
  clientsByUrl.delete(databaseUrl);
}

