/**
 * Projection Failure Policy - unit test
 * Microstep 5.2.1
 */

import { describe, it, expect } from 'vitest';
import {
  ProjectionFailurePolicy,
  type ProjectionFailureContext,
} from '../ProjectionFailurePolicy';

const baseContext: ProjectionFailureContext = {
  event: { id: 'e1', type: 'ThreadCreated' },
  targetVersion: 'v2',
  error: new Error('simulated'),
  attemptCount: 1,
};

describe('ProjectionFailurePolicy', () => {
  describe('Test 1 - Retry entro limite', () => {
    it('tentativi < max -> risultato RETRY', () => {
      const policy = new ProjectionFailurePolicy({
        maxRetries: 3,
        fallbackStrategy: 'DEAD_LETTER',
      });
      const r1 = policy.handleFailure({ ...baseContext, attemptCount: 1 });
      const r2 = policy.handleFailure({ ...baseContext, attemptCount: 2 });
      expect(r1.action).toBe('RETRY');
      expect(r2.action).toBe('RETRY');
    });
  });

  describe('Test 2 - Retry oltre limite', () => {
    it('tentativi >= max -> fallback DEAD_LETTER', () => {
      const policy = new ProjectionFailurePolicy({
        maxRetries: 2,
        fallbackStrategy: 'DEAD_LETTER',
      });
      const r = policy.handleFailure({ ...baseContext, attemptCount: 3 });
      expect(r.action).toBe('DEAD_LETTER');
    });

    it('tentativi >= max -> fallback SKIP_AND_ALERT', () => {
      const policy = new ProjectionFailurePolicy({
        maxRetries: 2,
        fallbackStrategy: 'SKIP_AND_ALERT',
      });
      const r = policy.handleFailure({ ...baseContext, attemptCount: 3 });
      expect(r.action).toBe('SKIP');
    });
  });

  describe('Test 3 - Dead Letter', () => {
    it('strategia configurata DEAD_LETTER -> risultato DEAD_LETTER', () => {
      const policy = new ProjectionFailurePolicy({
        maxRetries: 0,
        fallbackStrategy: 'DEAD_LETTER',
      });
      const r = policy.handleFailure({ ...baseContext, attemptCount: 1 });
      expect(r.action).toBe('DEAD_LETTER');
    });
  });

  describe('Test 4 - Skip & Alert', () => {
    it('strategia configurata SKIP_AND_ALERT -> risultato SKIP', () => {
      const policy = new ProjectionFailurePolicy({
        maxRetries: 0,
        fallbackStrategy: 'SKIP_AND_ALERT',
      });
      const r = policy.handleFailure({ ...baseContext, attemptCount: 1 });
      expect(r.action).toBe('SKIP');
    });
  });

  describe('Test 5 - Statelessness', () => {
    it('chiamate multiple -> nessuno stato interno mutato', () => {
      const policy = new ProjectionFailurePolicy({
        maxRetries: 2,
        fallbackStrategy: 'DEAD_LETTER',
      });
      const r1 = policy.handleFailure({ ...baseContext, attemptCount: 1 });
      const r2 = policy.handleFailure({ ...baseContext, attemptCount: 1 });
      const r3 = policy.handleFailure({ ...baseContext, attemptCount: 3 });
      expect(r1.action).toBe('RETRY');
      expect(r2.action).toBe('RETRY');
      expect(r3.action).toBe('DEAD_LETTER');
    });
  });

  describe('Test 6 - Compatibilita replay', () => {
    it('policy usata durante replay -> nessuna dipendenza da runtime live', () => {
      const policy = new ProjectionFailurePolicy({
        maxRetries: 2,
        fallbackStrategy: 'SKIP_AND_ALERT',
      });
      const ctx: ProjectionFailureContext = {
        event: { id: 'replay-e1', type: 'MessageAdded' },
        targetVersion: 'v2',
        error: new Error('replay error'),
        attemptCount: 3,
      };
      const r = policy.handleFailure(ctx);
      expect(r.action).toBe('SKIP');
    });
  });
});
