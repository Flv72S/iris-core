import { describe, it, expect } from 'vitest';
import { Thread } from '../Thread';
import type { ThreadRepository } from '../ThreadRepository';
import { ListThreads } from '../usecases/ListThreads';

class InMemoryThreadRepositoryFake implements ThreadRepository {
  private readonly store: Thread[] = [];
  public findAllCalls = 0;

  async save(thread: Thread): Promise<void> {
    const idx = this.store.findIndex((t) => t.getId() === thread.getId());
    if (idx >= 0) {
      this.store[idx] = thread;
      return;
    }
    this.store.push(thread);
  }

  async findById(id: string): Promise<Thread | null> {
    return this.store.find((t) => t.getId() === id) ?? null;
  }

  async findAll(): Promise<Thread[]> {
    this.findAllCalls += 1;
    // Restituisce array senza trasformazioni. (Copia dell'array, stessi oggetti)
    return [...this.store];
  }

  async deleteById(id: string): Promise<void> {
    const idx = this.store.findIndex((t) => t.getId() === id);
    if (idx >= 0) this.store.splice(idx, 1);
  }
}

describe('ListThreads (Core Use Case)', () => {
  it('1) Ritorna un array vuoto se il repository è vuoto', async () => {
    const repo = new InMemoryThreadRepositoryFake();
    const useCase = new ListThreads(repo);

    const result = await useCase.execute();

    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([]);
  });

  it('2) Ritorna le Thread presenti nel repository', async () => {
    const repo = new InMemoryThreadRepositoryFake();
    const t1 = Thread.create({ title: 'A' });
    const t2 = Thread.create({ title: 'B' });
    await repo.save(t1);
    await repo.save(t2);

    const useCase = new ListThreads(repo);
    const result = await useCase.execute();

    const ids = result.map((t) => t.getId());
    expect(ids).toContain(t1.getId());
    expect(ids).toContain(t2.getId());
  });

  it('3) Chiama findAll() una sola volta', async () => {
    const repo = new InMemoryThreadRepositoryFake();
    const useCase = new ListThreads(repo);

    await useCase.execute();

    expect(repo.findAllCalls).toBe(1);
  });

  it('4) Non modifica le istanze di Thread', async () => {
    const repo = new InMemoryThreadRepositoryFake();
    const t1 = Thread.create({ title: 'A' });
    const beforeTitle = t1.getTitle();
    const beforeArchived = t1.isArchived();
    const beforeCreatedAt = t1.getCreatedAt().getTime();
    const beforeUpdatedAt = t1.getUpdatedAt().getTime();
    await repo.save(t1);

    const useCase = new ListThreads(repo);
    const result = await useCase.execute();

    // Stessa istanza (nessuna clonazione/trasformazione lato use case)
    expect(result[0]).toBe(t1);

    // Nessuna mutazione osservabile
    expect(t1.getTitle()).toBe(beforeTitle);
    expect(t1.isArchived()).toBe(beforeArchived);
    expect(t1.getCreatedAt().getTime()).toBe(beforeCreatedAt);
    expect(t1.getUpdatedAt().getTime()).toBe(beforeUpdatedAt);
  });
});

