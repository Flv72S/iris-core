/**
 * Prisma Read Store — unit test con mock del delegate
 * Verifica che i metodi Prisma vengano chiamati correttamente senza DB reale.
 */

import { describe, it, expect, vi } from 'vitest';
import { PrismaReadStore, type PrismaReadStoreDelegate } from '../PrismaReadStore';

type DummyModel = { id: string; title: string };

describe('PrismaReadStore', () => {
  it('upsert chiama il delegate upsert con where, create e update', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const delegate: PrismaReadStoreDelegate<DummyModel> = {
      upsert,
      findUnique: vi.fn(),
      delete: vi.fn(),
    };
    const store = new PrismaReadStore(delegate);
    await store.upsert({ id: 'a', title: 'T' });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledWith({
      where: { id: 'a' },
      create: { id: 'a', title: 'T' },
      update: { id: 'a', title: 'T' },
    });
  });

  it('getById chiama findUnique e restituisce il modello', async () => {
    const model = { id: 'a', title: 'T' };
    const findUnique = vi.fn().mockResolvedValue(model);
    const delegate: PrismaReadStoreDelegate<DummyModel> = {
      upsert: vi.fn(),
      findUnique,
      delete: vi.fn(),
    };
    const store = new PrismaReadStore(delegate);
    const got = await store.getById('a');
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'a' } });
    expect(got).toEqual(model);
  });

  it('getById restituisce undefined se findUnique restituisce null', async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const delegate: PrismaReadStoreDelegate<DummyModel> = {
      upsert: vi.fn(),
      findUnique,
      delete: vi.fn(),
    };
    const store = new PrismaReadStore(delegate);
    const got = await store.getById('none');
    expect(got).toBeUndefined();
  });

  it('deleteById chiama il delegate delete con where', async () => {
    const del = vi.fn().mockResolvedValue(undefined);
    const delegate: PrismaReadStoreDelegate<DummyModel> = {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      delete: del,
    };
    const store = new PrismaReadStore(delegate);
    await store.deleteById('a');
    expect(del).toHaveBeenCalledWith({ where: { id: 'a' } });
  });
});
