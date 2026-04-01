import { describe, it, expect, vi } from 'vitest';
import type { ThreadId, MessageId } from '../../queries/read-models/ids';
import type { ThreadReadModel } from '../../queries/read-models/ThreadReadModel';
import type { MessageReadModel } from '../../queries/read-models/MessageReadModel';
import type { ThreadWithMessagesReadModel } from '../../queries/read-models/ThreadWithMessagesReadModel';
import type { MessageWithThreadReadModel } from '../../queries/read-models/MessageWithThreadReadModel';

import { ThreadReadProjectionImpl } from '../impl/ThreadReadProjectionImpl';
import { MessageReadProjectionImpl } from '../impl/MessageReadProjectionImpl';

describe('Core Projections — implementations (contract)', () => {
  it('ThreadReadProjectionImpl: delega a findById con stessi parametri e ritorna lo stesso valore', async () => {
    const id: ThreadId = 't-1';
    const returned: ThreadReadModel = {
      id: 't-1',
      title: 'T',
      archived: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const queryRepo = {
      findById: vi.fn(async (_id: ThreadId) => returned),
      findThreadWithMessagesById: vi.fn(async (_id: ThreadId) => null),
    };

    const proj = new ThreadReadProjectionImpl(queryRepo);
    const res = await proj.getThreadById(id);

    expect(queryRepo.findById).toHaveBeenCalledTimes(1);
    expect(queryRepo.findById).toHaveBeenCalledWith(id);
    expect(res).toBe(returned);
  });

  it('ThreadReadProjectionImpl: delega a findThreadWithMessagesById con stessi parametri e ritorna lo stesso valore', async () => {
    const id: ThreadId = 't-2';
    const returned: ThreadWithMessagesReadModel = {
      id: 't-2',
      title: 'T2',
      archived: false,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
      messages: [
        { id: 'm-1', author: 'a', content: 'c', createdAt: '2025-01-01T00:00:00.000Z' },
      ],
    };

    const queryRepo = {
      findById: vi.fn(async (_id: ThreadId) => null),
      findThreadWithMessagesById: vi.fn(async (_id: ThreadId) => returned),
    };

    const proj = new ThreadReadProjectionImpl(queryRepo);
    const res = await proj.getThreadWithMessages(id);

    expect(queryRepo.findThreadWithMessagesById).toHaveBeenCalledTimes(1);
    expect(queryRepo.findThreadWithMessagesById).toHaveBeenCalledWith(id);
    expect(res).toBe(returned);
  });

  it('ThreadReadProjectionImpl: projectThreadWithMessages delega a findThreadWithMessagesById', async () => {
    const id: ThreadId = 't-3';
    const returned: ThreadWithMessagesReadModel | null = null;

    const queryRepo = {
      findById: vi.fn(async (_id: ThreadId) => null),
      findThreadWithMessagesById: vi.fn(async (_id: ThreadId) => returned),
    };

    const proj = new ThreadReadProjectionImpl(queryRepo);
    const res = await proj.projectThreadWithMessages(id);

    expect(queryRepo.findThreadWithMessagesById).toHaveBeenCalledTimes(1);
    expect(queryRepo.findThreadWithMessagesById).toHaveBeenCalledWith(id);
    expect(res).toBe(returned);
  });

  it('MessageReadProjectionImpl: delega a findById con stessi parametri e ritorna lo stesso valore', async () => {
    const id: MessageId = 'm-1';
    const returned: MessageReadModel = {
      id: 'm-1',
      threadId: 't-1',
      author: 'a',
      content: 'c',
      createdAt: '2025-01-01T00:00:00.000Z',
    };

    const queryRepo = {
      findById: vi.fn(async (_id: MessageId) => returned),
      findMessageWithThreadById: vi.fn(async (_id: MessageId) => null),
    };

    const proj = new MessageReadProjectionImpl(queryRepo);
    const res = await proj.getMessageById(id);

    expect(queryRepo.findById).toHaveBeenCalledTimes(1);
    expect(queryRepo.findById).toHaveBeenCalledWith(id);
    expect(res).toBe(returned);
  });

  it('MessageReadProjectionImpl: delega a findMessageWithThreadById con stessi parametri e ritorna lo stesso valore', async () => {
    const id: MessageId = 'm-2';
    const returned: MessageWithThreadReadModel = {
      id: 'm-2',
      content: 'c2',
      author: 'b',
      createdAt: '2025-01-01T00:00:00.000Z',
      thread: { id: 't-9', title: 'T9', archived: false },
    };

    const queryRepo = {
      findById: vi.fn(async (_id: MessageId) => null),
      findMessageWithThreadById: vi.fn(async (_id: MessageId) => returned),
    };

    const proj = new MessageReadProjectionImpl(queryRepo);
    const res = await proj.getMessageWithThread(id);

    expect(queryRepo.findMessageWithThreadById).toHaveBeenCalledTimes(1);
    expect(queryRepo.findMessageWithThreadById).toHaveBeenCalledWith(id);
    expect(res).toBe(returned);
  });

  it('MessageReadProjectionImpl: projectMessageWithThread delega a findMessageWithThreadById', async () => {
    const id: MessageId = 'm-3';
    const returned: MessageWithThreadReadModel | null = null;

    const queryRepo = {
      findById: vi.fn(async (_id: MessageId) => null),
      findMessageWithThreadById: vi.fn(async (_id: MessageId) => returned),
    };

    const proj = new MessageReadProjectionImpl(queryRepo);
    const res = await proj.projectMessageWithThread(id);

    expect(queryRepo.findMessageWithThreadById).toHaveBeenCalledTimes(1);
    expect(queryRepo.findMessageWithThreadById).toHaveBeenCalledWith(id);
    expect(res).toBe(returned);
  });
});

