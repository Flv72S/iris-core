/**
 * In-Memory Read Store — unit test
 * Verifica: upsert crea/aggiorna, getById restituisce correttamente,
 * deleteById rimuove, comportamento su id inesistente.
 */

import { describe, it, expect } from 'vitest';
import { InMemoryReadStore } from '../InMemoryReadStore';

type DummyModel = { id: string; title: string };

describe('InMemoryReadStore', () => {
  it('upsert crea un record', async () => {
    const store = new InMemoryReadStore<DummyModel>();
    await store.upsert({ id: 'a', title: 'First' });
    const got = await store.getById('a');
    expect(got).toEqual({ id: 'a', title: 'First' });
  });

  it('upsert aggiorna un record esistente', async () => {
    const store = new InMemoryReadStore<DummyModel>();
    await store.upsert({ id: 'a', title: 'First' });
    await store.upsert({ id: 'a', title: 'Updated' });
    const got = await store.getById('a');
    expect(got).toEqual({ id: 'a', title: 'Updated' });
  });

  it('getById restituisce il record corretto', async () => {
    const store = new InMemoryReadStore<DummyModel>();
    await store.upsert({ id: 'x', title: 'X' });
    await store.upsert({ id: 'y', title: 'Y' });
    expect(await store.getById('x')).toEqual({ id: 'x', title: 'X' });
    expect(await store.getById('y')).toEqual({ id: 'y', title: 'Y' });
  });

  it('deleteById rimuove il record', async () => {
    const store = new InMemoryReadStore<DummyModel>();
    await store.upsert({ id: 'a', title: 'A' });
    await store.deleteById('a');
    expect(await store.getById('a')).toBeUndefined();
  });

  it('getById su id inesistente restituisce undefined', async () => {
    const store = new InMemoryReadStore<DummyModel>();
    expect(await store.getById('none')).toBeUndefined();
  });

  it('deleteById su id inesistente non lancia', async () => {
    const store = new InMemoryReadStore<DummyModel>();
    await expect(store.deleteById('none')).resolves.toBeUndefined();
  });
});
