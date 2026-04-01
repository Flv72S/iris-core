import { describe, it, expect } from 'vitest';
import type { Message } from '../../Message';
import type { MessageRepository } from '../../MessageRepository';
import { CreateMessage } from '../CreateMessage';

class InMemoryMessageRepositoryFake implements MessageRepository {
  public saveCalls = 0;
  public lastSaved: Message | null = null;

  async save(message: Message): Promise<void> {
    this.saveCalls += 1;
    this.lastSaved = message;
  }

  async findByThreadId(_threadId: string): Promise<Message[]> {
    return [];
  }

  async findById(_id: string): Promise<Message | null> {
    return null;
  }
}

describe('CreateMessage (Core Use Case)', () => {
  it('1) Happy path: crea un Message valido e chiama save una sola volta', async () => {
    const repo = new InMemoryMessageRepositoryFake();
    const useCase = new CreateMessage(repo);

    const created = await useCase.execute({
      threadId: 't-1',
      author: 'alice',
      content: 'hello',
    });

    expect(typeof created.id).toBe('string');
    expect(created.id.trim().length).toBeGreaterThan(0);
    expect(created.threadId).toBe('t-1');
    expect(created.author).toBe('alice');
    expect(created.content).toBe('hello');
    expect(created.createdAt instanceof Date).toBe(true);
    expect(Number.isNaN(created.createdAt.getTime())).toBe(false);

    expect(repo.saveCalls).toBe(1);
  });

  it('2) Content vuoto → lancia errore', async () => {
    const repo = new InMemoryMessageRepositoryFake();
    const useCase = new CreateMessage(repo);

    await expect(
      useCase.execute({
        threadId: 't-1',
        author: 'alice',
        content: '',
      })
    ).rejects.toThrowError();
  });

  it('3) Repository interaction: save invocato con un Message', async () => {
    const repo = new InMemoryMessageRepositoryFake();
    const useCase = new CreateMessage(repo);

    await useCase.execute({
      threadId: 't-1',
      author: 'alice',
      content: 'hello',
    });

    expect(repo.lastSaved).not.toBeNull();
    expect(repo.lastSaved).toBeTruthy();
    expect(typeof repo.lastSaved?.id).toBe('string');
  });
});

