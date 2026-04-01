/**
 * Read Event Publisher — contract test
 * Verifica: implementa la porta, publish non lancia, eventi raccolti in memoria.
 */

import { describe, it, expect } from 'vitest';
import { THREAD_READ_EVENT_VERSION } from '../../../core/read-events';
import type { ReadEventPublisher } from '../ReadEventPublisher';
import { InMemoryReadEventPublisher } from '../InMemoryReadEventPublisher';

describe('Read Event Publisher', () => {
  it('InMemoryReadEventPublisher implementa ReadEventPublisher', () => {
    const publisher: ReadEventPublisher = new InMemoryReadEventPublisher();
    expect(publisher.publish).toBeDefined();
    expect(typeof publisher.publish).toBe('function');
  });

  it('publish non lancia errori', async () => {
    const publisher = new InMemoryReadEventPublisher();
    const event = {
      type: 'ThreadCreated' as const,
      eventName: 'ThreadCreated' as const,
      eventVersion: THREAD_READ_EVENT_VERSION,
      id: 't-1',
      title: 'T',
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await expect(publisher.publish(event)).resolves.toBeUndefined();
  });

  it('Read Event viene raccolto in memoria', async () => {
    const publisher = new InMemoryReadEventPublisher();
    const event = {
      type: 'ThreadCreated' as const,
      eventName: 'ThreadCreated' as const,
      eventVersion: THREAD_READ_EVENT_VERSION,
      id: 't-1',
      title: 'T',
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await publisher.publish(event);
    const collected = publisher.getPublishedEvents();
    expect(collected.length).toBe(1);
    expect(collected[0].eventName).toBe('ThreadCreated');
    expect(collected[0].id).toBe('t-1');
  });
});
