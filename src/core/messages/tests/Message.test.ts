import { describe, it, expect } from 'vitest';
import { Message } from '../Message';

describe('Core Messages — Message entity', () => {
  it('1) Happy path: crea un Message valido', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const msg = new Message({
      id: 'm-1',
      threadId: 't-1',
      author: 'alice',
      content: 'hello',
      createdAt,
    });

    expect(msg.id).toBe('m-1');
    expect(msg.threadId).toBe('t-1');
    expect(msg.author).toBe('alice');
    expect(msg.content).toBe('hello');
    expect(msg.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });

  it('2) Invariante: content vuoto → errore', () => {
    expect(
      () =>
        new Message({
          id: 'm-1',
          threadId: 't-1',
          author: 'alice',
          content: '',
          createdAt: new Date(),
        })
    ).toThrowError(/Message\.content/i);
  });

  it('3) Invariante: content solo whitespace → errore', () => {
    expect(
      () =>
        new Message({
          id: 'm-1',
          threadId: 't-1',
          author: 'alice',
          content: '   ',
          createdAt: new Date(),
        })
    ).toThrowError(/Message\.content/i);
  });

  it('4) Invariante: threadId null/undefined → errore', () => {
    expect(
      () =>
        new Message({
          id: 'm-1',
          // @ts-expect-error test runtime for null
          threadId: null,
          author: 'alice',
          content: 'hello',
          createdAt: new Date(),
        })
    ).toThrowError(/Message\.threadId/i);

    expect(
      () =>
        new Message({
          id: 'm-1',
          // @ts-expect-error test runtime for undefined
          threadId: undefined,
          author: 'alice',
          content: 'hello',
          createdAt: new Date(),
        })
    ).toThrowError(/Message\.threadId/i);
  });

  it('5) Immutabilità: nessuna proprietà modificabile dopo la creazione', () => {
    const msg = new Message({
      id: 'm-1',
      threadId: 't-1',
      author: 'alice',
      content: 'hello',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (msg as any).contentValue = 'mutated';
    }).toThrow();

    expect(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (msg as any).idValue = 'm-2';
    }).toThrow();

    // Anche tentare di mutare Date restituita non deve alterare lo stato interno
    const d = msg.createdAt;
    d.setFullYear(2000);
    expect(msg.createdAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});

