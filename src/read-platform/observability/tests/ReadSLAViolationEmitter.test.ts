/**
 * Read SLA Violation Emitter - unit test
 * Verifica: emissione condizionata da freshness, struttura signal, no eccezioni.
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateAndEmit,
  InMemoryReadSLAViolationEmitter,
} from '../ReadSLAViolationEmitter';
import type { ReadFreshnessResult } from '../../freshness/ReadFreshness';

describe('ReadSLAViolationEmitter', () => {
  describe('evaluateAndEmit', () => {
    it('freshness fresh -> nessun signal emesso', () => {
      const emitter = new InMemoryReadSLAViolationEmitter();
      const freshness: ReadFreshnessResult = {
        status: 'fresh',
        ageMs: 1000,
        maxStalenessMs: 5000,
      };
      evaluateAndEmit(
        { freshness, readModel: 'thread' },
        emitter
      );
      expect(emitter.getEmitted()).toHaveLength(0);
    });

    it('freshness stale -> 1 signal stale-read con valori corretti', () => {
      const emitter = new InMemoryReadSLAViolationEmitter();
      const freshness: ReadFreshnessResult = {
        status: 'stale',
        ageMs: 6000,
        maxStalenessMs: 5000,
      };
      evaluateAndEmit(
        { freshness, readModel: 'thread', readId: 't1' },
        emitter
      );
      const signals = emitter.getEmitted();
      expect(signals).toHaveLength(1);
      expect(signals[0].kind).toBe('stale-read');
      expect(signals[0].readModel).toBe('thread');
      expect(signals[0].readId).toBe('t1');
      expect(signals[0].observedValue).toBe(6000);
      expect(signals[0].expectedValue).toBe(5000);
      expect(typeof signals[0].timestamp).toBe('number');
    });

    it('freshness unknown -> 1 signal unknown', () => {
      const emitter = new InMemoryReadSLAViolationEmitter();
      const freshness: ReadFreshnessResult = { status: 'unknown' };
      evaluateAndEmit(
        { freshness, readModel: 'message' },
        emitter
      );
      const signals = emitter.getEmitted();
      expect(signals).toHaveLength(1);
      expect(signals[0].kind).toBe('unknown');
      expect(signals[0].readModel).toBe('message');
      expect(signals[0].readId).toBeUndefined();
      expect(typeof signals[0].timestamp).toBe('number');
    });

    it('signal contiene readModel, readId (se fornito), timestamp', () => {
      const emitter = new InMemoryReadSLAViolationEmitter();
      const freshness: ReadFreshnessResult = {
        status: 'stale',
        ageMs: 100,
        maxStalenessMs: 50,
      };
      evaluateAndEmit(
        { freshness, readModel: 'thread', readId: 't42' },
        emitter
      );
      const s = emitter.getEmitted()[0];
      expect(s.readModel).toBe('thread');
      expect(s.readId).toBe('t42');
      expect(s.timestamp).toBeDefined();
      expect(typeof s.timestamp).toBe('number');
    });

    it('emitter non lancia mai eccezioni', () => {
      const emitter = new InMemoryReadSLAViolationEmitter();
      const freshness: ReadFreshnessResult = { status: 'stale', ageMs: 1, maxStalenessMs: 0 };
      expect(() => {
        evaluateAndEmit({ freshness, readModel: 'x' }, emitter);
      }).not.toThrow();
      expect(emitter.getEmitted()).toHaveLength(1);
    });

    it('determinismo strutturale: campi presenti', () => {
      const emitter = new InMemoryReadSLAViolationEmitter();
      const freshness: ReadFreshnessResult = {
        status: 'stale',
        ageMs: 10,
        maxStalenessMs: 5,
      };
      evaluateAndEmit({ freshness, readModel: 'msg', readId: 'm1' }, emitter);
      const s = emitter.getEmitted()[0];
      expect(s).toHaveProperty('kind');
      expect(s).toHaveProperty('readModel');
      expect(s).toHaveProperty('timestamp');
      expect(s.kind).toBe('stale-read');
      expect(s.readModel).toBe('msg');
      expect(s.readId).toBe('m1');
      expect(s.observedValue).toBe(10);
      expect(s.expectedValue).toBe(5);
    });
  });
});
