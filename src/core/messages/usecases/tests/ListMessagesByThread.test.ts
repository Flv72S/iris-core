import { describe, it, expect } from 'vitest';
import type { Message } from '../../Message';
import type { MessageRepository } from '../../MessageRepository';
import { Message as MessageEntity } from '../../Message';
import { ListMessagesByThread } from '../ListMessagesByThread';

class InMemoryMessageRepositoryFake implements MessageRepository {
  public findByThreadIdCalls = 0;
  public lastThreadId: string | null = null;
  private readonly byThreadId = new Map<string, Message[]>();

  setThreadMessages(threadId: string, messages: Message[]): void {
    this.byThreadId.set(threadId, messages);
  }

  async save(_message: Message): Promise<void> {
    // non usato in questi test
  }

  async findByThreadId(threadId: string): Promise<Message[]> {
    this.findByThreadIdCalls += 1;
    this.lastThreadId = threadId;
    return this.byThreadId.get(threadId) ?? [];
  }

  async findById(_id: string): Promise<Message | null> {
    return null;
  }
}

describe('ListMessagesByThread (Core Use Case)', () => {
  it('1) Lista vuota: repository ritorna [] → use case ritorna []', async () => {
    const repo = new InMemoryMessageRepositoryFake();
    const useCase = new ListMessagesByThread(repo);

    const res = await useCase.execute('t-1');

    expect(res).toEqual([]);
  });

  it('2) Lista con N messaggi: restituisce esattamente i messaggi (stesso ordine)', async () => {
    const repo = new InMemoryMessageRepositoryFake();
    const useCase = new ListMessagesByThread(repo);

    const m1 = new MessageEntity({
      id: 'm-1',
      threadId: 't-1',
      author: 'alice',
      content: 'A',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    const m2 = new MessageEntity({
      id: 'm-2',
      threadId: 't-1',
      author: 'bob',
      content: 'B',
      createdAt: new Date('2026-01-01T00:00:01.000Z'),
    });
    repo.setThreadMessages('t-1', [m1, m2]);

    const res = await useCase.execute('t-1');

    expect(res).toEqual([m1, m2]);
  });

  it('3) Interazione repository: findByThreadId chiamato una sola volta con threadId corretto', async () => {
    const repo = new InMemoryMessageRepositoryFake();
    const useCase = new ListMessagesByThread(repo);

    await useCase.execute('t-xyz');

    expect(repo.findByThreadIdCalls).toBe(1);
    expect(repo.lastThreadId).toBe('t-xyz');
  });
});

