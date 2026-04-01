import { describe, it, expect } from 'vitest';
import { Message } from '../../../core/messages/Message';
import { InMemoryMessageRepository } from '../InMemoryMessageRepository';

describe('Persistence — InMemoryMessageRepository (contract)', () => {
  it('1) save + findById: salva e recupera lo stesso messaggio (stesso riferimento)', async () => {
    const repo = new InMemoryMessageRepository();
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
    expect(found).toBe(msg);
    expect(found?.id).toBe('m-1');
    expect(found?.threadId).toBe('t-1');
    expect(found?.author).toBe('alice');
    expect(found?.content).toBe('hello');
    expect(found?.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('2) findByThreadId: thread senza messaggi → []', async () => {
    const repo = new InMemoryMessageRepository();
    const res = await repo.findByThreadId('t-404');
    expect(res).toEqual([]);
  });

  it('3) findByThreadId: thread con N messaggi → lista completa in ordine di inserimento', async () => {
    const repo = new InMemoryMessageRepository();

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
    expect(res).toEqual([m1, m2]);
  });

  it('4) Isolamento: messaggi di thread diversi non si mescolano', async () => {
    const repo = new InMemoryMessageRepository();

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

    expect(await repo.findByThreadId('t-A')).toEqual([a1, a2]);
    expect(await repo.findByThreadId('t-B')).toEqual([b1]);
  });
});

