/**
 * Prisma Client per Query Layer (single round-trip)
 *
 * Assicura entrambe le tabelle Thread e Message sullo stesso DB
 * per consentire query con include (un solo round-trip).
 * Usato solo dai Query Repository per findThreadWithMessagesById e findMessageWithThreadById.
 */

import { PrismaClient } from '@prisma/client';

type ClientEntry = {
  readonly client: PrismaClient;
  initialized: boolean;
};

const clientsByUrl = new Map<string, ClientEntry>();

async function ensureQueriesSchema(client: PrismaClient): Promise<void> {
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Thread" (
      "id" TEXT PRIMARY KEY NOT NULL,
      "title" TEXT NOT NULL,
      "archived" INTEGER NOT NULL,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    );
  `);
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

export async function getQueriesPrismaClient(databaseUrl: string): Promise<PrismaClient> {
  const existing = clientsByUrl.get(databaseUrl);
  if (existing) {
    if (!existing.initialized) {
      await ensureQueriesSchema(existing.client);
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

  await ensureQueriesSchema(client);
  entry.initialized = true;

  return client;
}
