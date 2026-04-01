/**
 * PrismaMessageRepository — Contract Test (Core Contract-Preserving)
 *
 * Scopo: verificare che l'adapter persistence rispetti il contratto di `MessageRepository`.
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

import { Message } from '../../../core/messages/Message';
import { PrismaMessageRepository } from '../PrismaMessageRepository';

function toSqliteFileUrl(absPath: string): string {
  return `file:${absPath.replace(/\\/g, '/')}`;
}

describe('PrismaMessageRepository (SQLite + Prisma) — Contract', () => {
  let repo: PrismaMessageRepository;
  let dbDir: string;
  let dbPath: string;
  let dbUrl: string;

  beforeEach(async () => {
    dbDir = join(process.cwd(), '.tmp', 'prisma-messages', randomUUID());
    mkdirSync(dbDir, { recursive: true });
    dbPath = join(dbDir, 'test.db');
    dbUrl = toSqliteFileUrl(dbPath);
    repo = new PrismaMessageRepository(dbUrl);
  });

  afterEach(async () => {
    await repo.close();
    rmSync(dbDir, { recursive: true, force: true });
  });

  it('1) save + findById: salva e recupera lo stesso messaggio (valori immutati)', async () => {
    const msg = new Message({
      id: 'm-1',
      threadId: 't-1',
      author: 'alice',
      content: 'hello',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await repo.save(msg);
    const found = await repo.findById('m-1');

    expect(found).not.toBeNull();
    expect(found?.id).toBe('m-1');
    expect(found?.threadId).toBe('t-1');
    expect(found?.author).toBe('alice');
    expect(found?.content).toBe('hello');
    expect(found?.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('2) findByThreadId: thread senza messaggi → []', async () => {
    const res = await repo.findByThreadId('t-404');
    expect(res).toEqual([]);
  });

  it('3) findByThreadId: thread con N messaggi → lista completa (ordine di inserimento)', async () => {
    const m1 = new Message({
      id: 'm-1',
      threadId: 't-1',
      author: 'alice',
      content: 'A',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const m2 = new Message({
      id: 'm-2',
      threadId: 't-1',
      author: 'bob',
      content: 'B',
      createdAt: new Date('2026-01-01T00:00:01.000Z'),
    });

    await repo.save(m1);
    await repo.save(m2);

    const res = await repo.findByThreadId('t-1');
    expect(res.length).toBe(2);
    expect(res[0].id).toBe('m-1');
    expect(res[1].id).toBe('m-2');
  });

  it('4) Isolamento: messaggi di thread diversi non si mescolano', async () => {
    const a1 = new Message({
      id: 'a-1',
      threadId: 't-A',
      author: 'alice',
      content: 'A1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const b1 = new Message({
      id: 'b-1',
      threadId: 't-B',
      author: 'bob',
      content: 'B1',
      createdAt: new Date('2026-01-01T00:00:01.000Z'),
    });
    const a2 = new Message({
      id: 'a-2',
      threadId: 't-A',
      author: 'alice',
      content: 'A2',
      createdAt: new Date('2026-01-01T00:00:02.000Z'),
    });

    await repo.save(a1);
    await repo.save(b1);
    await repo.save(a2);

    const a = await repo.findByThreadId('t-A');
    const b = await repo.findByThreadId('t-B');

    expect(a.map((m) => m.id)).toEqual(['a-1', 'a-2']);
    expect(b.map((m) => m.id)).toEqual(['b-1']);
  });
});

