/**
 * Thread Projection Handler — unit test
 * Verifica: ogni tipo di Read Event produce un Read Model coerente;
 * funzioni pure e deterministiche; nessuna mutazione dell'input.
 */

import { describe, it, expect } from 'vitest';
import { THREAD_READ_EVENT_VERSION } from '../../../read-events';
import { projectThreadEvent } from '../ThreadProjectionHandler';

describe('ThreadProjectionHandler', () => {
  it('ThreadCreatedReadEvent produce un ThreadReadModel coerente', () => {
    const event = {
      type: 'ThreadCreated' as const,
      eventName: 'ThreadCreated' as const,
      eventVersion: THREAD_READ_EVENT_VERSION,
      id: 't-1',
      title: 'Titolo',
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const model = projectThreadEvent(event);
    expect(model.id).toBe('t-1');
    expect(model.title).toBe('Titolo');
    expect(model.archived).toBe(false);
    expect(model.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(model.updatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('ThreadUpdatedReadEvent produce un ThreadReadModel coerente', () => {
    const event = {
      type: 'ThreadUpdated' as const,
      eventName: 'ThreadUpdated' as const,
      eventVersion: THREAD_READ_EVENT_VERSION,
      id: 't-1',
      title: 'Nuovo titolo',
      archived: false,
      updatedAt: '2026-01-02T00:00:00.000Z',
    };
    const model = projectThreadEvent(event);
    expect(model.id).toBe('t-1');
    expect(model.title).toBe('Nuovo titolo');
    expect(model.archived).toBe(false);
    expect(model.updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('ThreadArchivedReadEvent produce un ThreadReadModel coerente', () => {
    const event = {
      type: 'ThreadArchived' as const,
      eventName: 'ThreadArchived' as const,
      eventVersion: THREAD_READ_EVENT_VERSION,
      id: 't-1',
      archived: true as const,
      updatedAt: '2026-01-03T00:00:00.000Z',
    };
    const model = projectThreadEvent(event);
    expect(model.id).toBe('t-1');
    expect(model.archived).toBe(true);
    expect(model.updatedAt).toBe('2026-01-03T00:00:00.000Z');
  });

  it('è deterministico: stesso input produce stesso output', () => {
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
    const a = projectThreadEvent(event);
    const b = projectThreadEvent(event);
    expect(a).toEqual(b);
  });

  it('non muta le strutture in input', () => {
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
    const snapshot = { ...event };
    projectThreadEvent(event);
    expect(event).toEqual(snapshot);
  });
});
