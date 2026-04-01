/**
 * InMemory Read Cache - unit test
 * Verifica: set+get, get su chiave inesistente, TTL prima/dopo scadenza, delete idempotente.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InMemoryReadCache } from '../InMemoryReadCache';

describe('InMemoryReadCache', () => {
  describe('set + get', () => {
    it('set + get restituisce il valore', async () => {
      const cache = new InMemoryReadCache<string>();
      await cache.set('k1', 'v1');
      expect(await cache.get('k1')).toBe('v1');
    });
  });

  describe('get su chiave inesistente', () => {
    it('get su chiave inesistente restituisce undefined', async () => {
      const cache = new InMemoryReadCache<string>();
      expect(await cache.get('missing')).toBeUndefined();
    });
  });

  describe('TTL', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('set con TTL: valore disponibile prima della scadenza', async () => {
      const cache = new InMemoryReadCache<string>();
      await cache.set('k', 'v', 5000);
      expect(await cache.get('k')).toBe('v');
    });

    it('set con TTL: undefined dopo la scadenza', async () => {
      const cache = new InMemoryReadCache<string>();
      await cache.set('k', 'v', 5000);
      vi.advanceTimersByTime(6000);
      expect(await cache.get('k')).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('delete rimuove il valore', async () => {
      const cache = new InMemoryReadCache<string>();
      await cache.set('k', 'v');
      await cache.delete('k');
      expect(await cache.get('k')).toBeUndefined();
    });

    it('delete su chiave inesistente non lancia', async () => {
      const cache = new InMemoryReadCache<string>();
      await expect(cache.delete('missing')).resolves.toBeUndefined();
    });
  });
});
