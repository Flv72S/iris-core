import { describe, it, expect } from 'vitest';
import { Thread } from '../Thread';
import type { ThreadRepository } from '../ThreadRepository';

/**
 * Contract Test Harness (Core-only)
 *
 * Scopo: verificare che QUALSIASI implementazione futura di `ThreadRepository`
 * rispetti il contratto definito in `ThreadRepository.ts`.
 *
 * Nota: questo file NON implementa una persistence reale. Usa fake inline.
 */

async function verifyThreadRepositoryContract(repo: ThreadRepository): Promise<void> {
  // 1) findById ritorna null se non esiste
  {
    const missing = await repo.findById('missing-id');
    if (missing !== null) {
      throw new Error('Contract violation: findById(id) must return null when not found');
    }
  }

  // 2) save + findById → ritorna entity
  const thread = Thread.create({ title: 'A' });
  await repo.save(thread);

  const fetched = await repo.findById(thread.getId());
  if (fetched === null) {
    throw new Error('Contract violation: save() + findById() must return the saved entity');
  }
  if (typeof (fetched as any).getId !== 'function') {
    throw new Error('Contract violation: findById() must return a Thread-like entity');
  }
  if (fetched.getId() !== thread.getId()) {
    throw new Error('Contract violation: findById() returned entity with different id');
  }

  // 3) save è idempotente sullo stesso ID (no duplicati)
  await repo.save(thread);
  const allAfterIdempotentSave = await repo.findAll();
  if (!Array.isArray(allAfterIdempotentSave)) {
    throw new Error('Contract violation: findAll() must always return an array');
  }
  const countSameId = allAfterIdempotentSave.filter((t) => t.getId() === thread.getId()).length;
  if (countSameId !== 1) {
    throw new Error('Contract violation: save() must be upsert; duplicates detected for same id');
  }

  // 4) deleteById è idempotente (no throw se non esiste)
  await repo.deleteById(thread.getId());
  await repo.deleteById(thread.getId());

  const afterDelete = await repo.findById(thread.getId());
  if (afterDelete !== null) {
    throw new Error('Contract violation: deleteById() must remove the entity (findById should return null)');
  }

  // 5) findAll ritorna array coerente (anche vuoto)
  const t2 = Thread.create({ title: 'B' });
  const t3 = Thread.create({ title: 'C' });
  await repo.save(t2);
  await repo.save(t3);

  const all = await repo.findAll();
  if (!Array.isArray(all)) {
    throw new Error('Contract violation: findAll() must always return an array');
  }

  const ids = new Set(all.map((t) => t.getId()));
  if (!ids.has(t2.getId()) || !ids.has(t3.getId())) {
    throw new Error('Contract violation: findAll() must include all saved threads');
  }
}

class InMemoryThreadRepositoryFake implements ThreadRepository {
  private readonly store = new Map<string, Thread>();

  async save(thread: Thread): Promise<void> {
    this.store.set(thread.getId(), thread);
  }

  async findById(id: string): Promise<Thread | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<Thread[]> {
    return Array.from(this.store.values());
  }

  async deleteById(id: string): Promise<void> {
    this.store.delete(id);
  }
}

class BrokenThreadRepositoryFake implements ThreadRepository {
  private readonly store = new Map<string, Thread>();

  async save(thread: Thread): Promise<void> {
    // broken on purpose: duplicates by pushing into list-like structure (simulated)
    // We simulate "duplicates" by re-inserting with a modified key.
    this.store.set(`${thread.getId()}-${Math.random()}`, thread as any);
  }

  async findById(_id: string): Promise<Thread | null> {
    // broken on purpose: returns undefined (violates null rule)
    return undefined as any;
  }

  async findAll(): Promise<Thread[]> {
    return Array.from(this.store.values());
  }

  async deleteById(_id: string): Promise<void> {
    // broken on purpose: throw when missing (violates idempotency)
    throw new Error('not found');
  }
}

describe('ThreadRepository — Contract Tests (Core)', () => {
  it('deve PASSARE per una implementazione che rispetta il contratto', async () => {
    const repo = new InMemoryThreadRepositoryFake();
    await expect(verifyThreadRepositoryContract(repo)).resolves.toBeUndefined();
  });

  it('deve FALLIRE se una implementazione viola il contratto', async () => {
    const repo = new BrokenThreadRepositoryFake();
    await expect(verifyThreadRepositoryContract(repo)).rejects.toThrowError();
  });
});

