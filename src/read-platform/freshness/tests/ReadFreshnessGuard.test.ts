/**
 * Read Freshness Guard - unit test
 * Verifica: valutazione pura e deterministica di freshness. Nessun enforcement.
 */

import { describe, it, expect } from 'vitest';
import { ReadFreshnessGuard } from '../ReadFreshnessGuard';
import type { ReadSLA } from '../../../core/read-sla';

describe('ReadFreshnessGuard', () => {
  const guard = new ReadFreshnessGuard();

  describe('status: unknown', () => {
    it('lastUpdatedAt assente -> status: unknown', () => {
      const sla: ReadSLA = { maxStalenessMs: 5000 };
      const result = guard.evaluate(undefined, sla, 10000);
      expect(result.status).toBe('unknown');
      expect(result.ageMs).toBeUndefined();
      expect(result.maxStalenessMs).toBeUndefined();
    });

    it('sla assente -> status: unknown', () => {
      const result = guard.evaluate(5000, undefined, 10000);
      expect(result.status).toBe('unknown');
      expect(result.ageMs).toBeUndefined();
      expect(result.maxStalenessMs).toBeUndefined();
    });

    it('sla senza maxStalenessMs -> status: unknown', () => {
      const sla: ReadSLA = { cacheTTLms: 60000 };
      const result = guard.evaluate(5000, sla, 10000);
      expect(result.status).toBe('unknown');
      expect(result.ageMs).toBeUndefined();
      expect(result.maxStalenessMs).toBeUndefined();
    });
  });

  describe('status: fresh', () => {
    it('dato entro maxStalenessMs -> status: fresh', () => {
      const sla: ReadSLA = { maxStalenessMs: 5000 };
      const lastUpdatedAt = 10000;
      const now = 14000; // age = 4000ms < 5000ms
      const result = guard.evaluate(lastUpdatedAt, sla, now);
      expect(result.status).toBe('fresh');
      expect(result.ageMs).toBe(4000);
      expect(result.maxStalenessMs).toBe(5000);
    });

    it('dato esattamente a maxStalenessMs -> status: fresh', () => {
      const sla: ReadSLA = { maxStalenessMs: 5000 };
      const lastUpdatedAt = 10000;
      const now = 15000; // age = 5000ms = 5000ms
      const result = guard.evaluate(lastUpdatedAt, sla, now);
      expect(result.status).toBe('fresh');
      expect(result.ageMs).toBe(5000);
      expect(result.maxStalenessMs).toBe(5000);
    });
  });

  describe('status: stale', () => {
    it('dato oltre maxStalenessMs -> status: stale', () => {
      const sla: ReadSLA = { maxStalenessMs: 5000 };
      const lastUpdatedAt = 10000;
      const now = 16000; // age = 6000ms > 5000ms
      const result = guard.evaluate(lastUpdatedAt, sla, now);
      expect(result.status).toBe('stale');
      expect(result.ageMs).toBe(6000);
      expect(result.maxStalenessMs).toBe(5000);
    });
  });

  describe('ageMs calculation', () => {
    it('ageMs calcolato correttamente usando now iniettato', () => {
      const sla: ReadSLA = { maxStalenessMs: 10000 };
      const lastUpdatedAt = 1000;
      const now = 8000;
      const result = guard.evaluate(lastUpdatedAt, sla, now);
      expect(result.ageMs).toBe(7000);
    });
  });

  describe('determinism', () => {
    it('stesso input -> stesso output (deterministico)', () => {
      const sla: ReadSLA = { maxStalenessMs: 5000 };
      const lastUpdatedAt = 10000;
      const now = 14000;
      const result1 = guard.evaluate(lastUpdatedAt, sla, now);
      const result2 = guard.evaluate(lastUpdatedAt, sla, now);
      expect(result1).toEqual(result2);
    });
  });
});
