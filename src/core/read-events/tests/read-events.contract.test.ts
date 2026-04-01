/**
 * Read Event Contracts — contract test
 * Verifica serializzabilità e struttura; nessuna logica.
 */

import { describe, it, expect } from 'vitest';
import {
  THREAD_READ_EVENT_VERSION,
  MESSAGE_READ_EVENT_VERSION,
  type ThreadReadEvent,
  type MessageReadEvent,
} from '../index';

describe('Read Event Contracts', () => {
  it('ThreadReadEvent: serializzabile e include eventName + eventVersion', () => {
    const e: ThreadReadEvent = {
      type: 'ThreadCreated',
      eventName: 'ThreadCreated',
      eventVersion: THREAD_READ_EVENT_VERSION,
      id: 't-1',
      title: 'T',
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const str = JSON.stringify(e);
    const back = JSON.parse(str) as ThreadReadEvent;
    expect(back.eventName).toBe('ThreadCreated');
    expect(back.eventVersion).toBe('v1');
    expect(back.id).toBe('t-1');
  });

  it('MessageReadEvent: serializzabile e include eventName + eventVersion', () => {
    const e: MessageReadEvent = {
      type: 'MessageAdded',
      eventName: 'MessageAdded',
      eventVersion: MESSAGE_READ_EVENT_VERSION,
      id: 'm-1',
      threadId: 't-1',
      author: 'a',
      content: 'c',
      createdAt: '2026-01-01T00:00:00.000Z',
    };
    const str = JSON.stringify(e);
    const back = JSON.parse(str) as MessageReadEvent;
    expect(back.eventName).toBe('MessageAdded');
    expect(back.eventVersion).toBe('v1');
    expect(back.id).toBe('m-1');
  });
});
