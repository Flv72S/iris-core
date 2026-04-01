/**
 * PrismaThreadRepository — Contract Test (Core Contract-Preserving)
 *
 * Scopo: verificare che l'adapter persistence rispetti il contratto di `ThreadRepository`.
 *
 * Vincoli:
 * - no mock Prisma
 * - no fake repository
 * - test solo dell'adapter (non del Core)
 * - DB isolato per test (SQLite file temporaneo)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import { Thread } from '../../../core/threads/Thread';
import { PrismaThreadRepository } from '../PrismaThreadRepository';

function toSqliteFileUrl(absPath: string): string {
  return `file:${absPath.replace(/\\/g, '/')}`;
}

describe('PrismaThreadRepository (SQLite + Prisma) — Contract', () => {
  let repo: PrismaThreadRepository;
  let dbDir: string;
  let dbPath: string;
  let dbUrl: string;

  beforeEach(async () => {
    dbDir = join(process.cwd(), '.tmp', 'prisma-threads', randomUUID());
    mkdirSync(dbDir, { recursive: true });
    dbPath = join(dbDir, 'test.db');
    dbUrl = toSqliteFileUrl(dbPath);
    repo = new PrismaThreadRepository(dbUrl);
  });

  afterEach(async () => {
    await repo.close();
    rmSync(dbDir, { recursive: true, force: true });
  });

  it('findById ritorna null se non esiste', async () => {
    const missing = await repo.findById('missing-id');
    expect(missing).toBeNull();
  });

  it('save + findById → ritorna entity', async () => {
    const thread = Thread.create({ title: 'A' });
    await repo.save(thread);

    const fetched = await repo.findById(thread.getId());
    expect(fetched).not.toBeNull();
    expect(fetched?.getId()).toBe(thread.getId());
    expect(fetched?.getTitle()).toBe('A');
  });

  it('save è upsert sullo stesso ID (no duplicati)', async () => {
    const thread = Thread.create({ title: 'A' });
    await repo.save(thread);
    await repo.save(thread);

    const all = await repo.findAll();
    expect(Array.isArray(all)).toBe(true);
    const count = all.filter((t) => t.getId() === thread.getId()).length;
    expect(count).toBe(1);
  });

  it('deleteById è idempotente', async () => {
    const thread = Thread.create({ title: 'A' });
    await repo.save(thread);

    await expect(repo.deleteById(thread.getId())).resolves.toBeUndefined();
    await expect(repo.deleteById(thread.getId())).resolves.toBeUndefined();

    const fetched = await repo.findById(thread.getId());
    expect(fetched).toBeNull();
  });

  it('findAll ritorna sempre array (vuoto / con elementi)', async () => {
    const empty = await repo.findAll();
    expect(Array.isArray(empty)).toBe(true);

    const t1 = Thread.create({ title: 'A' });
    const t2 = Thread.create({ title: 'B' });
    await repo.save(t1);
    await repo.save(t2);

    const all = await repo.findAll();
    expect(Array.isArray(all)).toBe(true);

    const ids = all.map((t) => t.getId());
    expect(ids).toContain(t1.getId());
    expect(ids).toContain(t2.getId());
  });
});

