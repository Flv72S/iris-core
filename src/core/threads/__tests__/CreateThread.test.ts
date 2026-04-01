import { describe, it, expect } from 'vitest';
import { Thread } from '../Thread';
import type { ThreadRepository } from '../ThreadRepository';
import { CreateThread } from '../usecases/CreateThread';

class InMemoryThreadRepositoryFake implements ThreadRepository {
  private readonly store = new Map<string, Thread>();
  public saveCalls = 0;

  async save(thread: Thread): Promise<void> {
    this.saveCalls += 1;
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

describe('CreateThread (Core Use Case)', () => {
  it('1) Crea una Thread valida e la salva nel repository', async () => {
    const repo = new InMemoryThreadRepositoryFake();
    const useCase = new CreateThread(repo);

    const created = await useCase.execute({ title: 'Hello' });

    const stored = await repo.findById(created.getId());
    expect(stored).not.toBeNull();
    expect(stored?.getId()).toBe(created.getId());
    expect(stored?.getTitle()).toBe('Hello');
  });

  it('2) Ritorna la Thread creata', async () => {
    const repo = new InMemoryThreadRepositoryFake();
    const useCase = new CreateThread(repo);

    const created = await useCase.execute({ title: 'Hello' });

    expect(created.getId().trim().length).toBeGreaterThan(0);
    expect(created.getTitle()).toBe('Hello');
    expect(created.isArchived()).toBe(false);
  });

  it('3) Propaga errori se i dati violano le invarianti', async () => {
    const repo = new InMemoryThreadRepositoryFake();
    const useCase = new CreateThread(repo);

    await expect(useCase.execute({ title: '' })).rejects.toThrowError();
    await expect(useCase.execute({ title: '   ' })).rejects.toThrowError();
  });

  it('4) Chiama save una sola volta', async () => {
    const repo = new InMemoryThreadRepositoryFake();
    const useCase = new CreateThread(repo);

    await useCase.execute({ title: 'Hello' });

    expect(repo.saveCalls).toBe(1);
  });

  it('5) NON accede direttamente a campi interni della Thread (solo API pubblica)', async () => {
    // Questo test verifica il comportamento osservabile: il repository riceve una `Thread`
    // e il test interagisce esclusivamente tramite metodi pubblici (getId/getTitle/...).
    const repo = new InMemoryThreadRepositoryFake();
    const useCase = new CreateThread(repo);

    const created = await useCase.execute({ title: 'Hello' });
    const stored = await repo.findById(created.getId());

    expect(stored).not.toBeNull();
    expect(stored?.getTitle()).toBe('Hello');
  });
});

