/**
 * Phase 8 — Safety Checklist Rules tests
 */

import { describe, it, expect } from 'vitest';
import {
  checkNoSignalLayerWrite,
  checkNoPreferenceMutation,
  checkNoImplicitLearning,
  checkDeterministicOutput,
  checkReplaySafe,
  checkStateIsolated,
  checkPhase7BoundaryPreserved,
} from '../checklist/safety-checklist.rules';

const passingBoundary: import('../checklist/safety-checklist.types').Phase7BoundaryReport = {
  signalLayerIsolation: true,
  preferenceImmutability: true,
  learningInactive: true,
  phase7FullyCertified: true,
};

const failingBoundary: import('../checklist/safety-checklist.types').Phase7BoundaryReport = {
  signalLayerIsolation: false,
  preferenceImmutability: false,
  learningInactive: false,
  phase7FullyCertified: false,
};

describe('Safety checklist rules', () => {
  describe('checkNoSignalLayerWrite', () => {
    it('passes when signalLayerIsolation is true', () => {
      const r = checkNoSignalLayerWrite({ boundaryReport: passingBoundary });
      expect(r.checkId).toBe('NO_SIGNAL_LAYER_WRITE');
      expect(r.passed).toBe(true);
    });
    it('fails when signalLayerIsolation is false', () => {
      const r = checkNoSignalLayerWrite({ boundaryReport: failingBoundary });
      expect(r.passed).toBe(false);
      expect(r.details).toBeDefined();
    });
    it('produces deterministic output', () => {
      const a = checkNoSignalLayerWrite({ boundaryReport: passingBoundary });
      const b = checkNoSignalLayerWrite({ boundaryReport: passingBoundary });
      expect(a).toEqual(b);
    });
  });

  describe('checkNoPreferenceMutation', () => {
    it('passes when preferenceImmutability is true', () => {
      const r = checkNoPreferenceMutation({ boundaryReport: passingBoundary });
      expect(r.passed).toBe(true);
    });
    it('fails when preferenceImmutability is false', () => {
      const r = checkNoPreferenceMutation({ boundaryReport: failingBoundary });
      expect(r.passed).toBe(false);
    });
    it('produces deterministic output', () => {
      const a = checkNoPreferenceMutation({ boundaryReport: passingBoundary });
      const b = checkNoPreferenceMutation({ boundaryReport: passingBoundary });
      expect(a).toEqual(b);
    });
  });

  describe('checkNoImplicitLearning', () => {
    it('passes when learningInactive is true', () => {
      const r = checkNoImplicitLearning({ boundaryReport: passingBoundary });
      expect(r.passed).toBe(true);
    });
    it('fails when learningInactive is false', () => {
      const r = checkNoImplicitLearning({ boundaryReport: failingBoundary });
      expect(r.passed).toBe(false);
    });
    it('produces deterministic output', () => {
      const a = checkNoImplicitLearning({ boundaryReport: passingBoundary });
      const b = checkNoImplicitLearning({ boundaryReport: passingBoundary });
      expect(a).toEqual(b);
    });
  });

  describe('checkDeterministicOutput', () => {
    it('passes when deterministicOutput is true', () => {
      const r = checkDeterministicOutput({
        executionMetadata: { deterministicOutput: true, stateMutations: 0 },
      });
      expect(r.passed).toBe(true);
    });
    it('fails when deterministicOutput is false', () => {
      const r = checkDeterministicOutput({
        executionMetadata: { deterministicOutput: false, stateMutations: 0 },
      });
      expect(r.passed).toBe(false);
    });
    it('produces deterministic output', () => {
      const meta = { deterministicOutput: true, stateMutations: 0 };
      const a = checkDeterministicOutput({ executionMetadata: meta });
      const b = checkDeterministicOutput({ executionMetadata: meta });
      expect(a).toEqual(b);
    });
  });

  describe('checkReplaySafe', () => {
    it('passes when no replay result (not applicable)', () => {
      const r = checkReplaySafe({});
      expect(r.passed).toBe(true);
      expect(r.details).toContain('not applicable');
    });
    it('passes when replay success and deterministicMatch', () => {
      const r = checkReplaySafe({
        replayResult: { success: true, deterministicMatch: true },
      });
      expect(r.passed).toBe(true);
    });
    it('fails when replay failed', () => {
      const r = checkReplaySafe({
        replayResult: { success: false, deterministicMatch: true },
      });
      expect(r.passed).toBe(false);
    });
    it('fails when replay not deterministic', () => {
      const r = checkReplaySafe({
        replayResult: { success: true, deterministicMatch: false },
      });
      expect(r.passed).toBe(false);
    });
    it('produces deterministic output', () => {
      const rep = { success: true, deterministicMatch: true };
      const a = checkReplaySafe({ replayResult: rep });
      const b = checkReplaySafe({ replayResult: rep });
      expect(a).toEqual(b);
    });
  });

  describe('checkStateIsolated', () => {
    it('passes when stateMutations is 0', () => {
      const r = checkStateIsolated({
        executionMetadata: { deterministicOutput: true, stateMutations: 0 },
      });
      expect(r.passed).toBe(true);
    });
    it('fails when stateMutations > 0', () => {
      const r = checkStateIsolated({
        executionMetadata: { deterministicOutput: true, stateMutations: 1 },
      });
      expect(r.passed).toBe(false);
      expect(r.details).toContain('stateMutations');
    });
    it('produces deterministic output', () => {
      const meta = { deterministicOutput: true, stateMutations: 0 };
      const a = checkStateIsolated({ executionMetadata: meta });
      const b = checkStateIsolated({ executionMetadata: meta });
      expect(a).toEqual(b);
    });
  });

  describe('checkPhase7BoundaryPreserved', () => {
    it('passes when phase7FullyCertified is true', () => {
      const r = checkPhase7BoundaryPreserved({ boundaryReport: passingBoundary });
      expect(r.passed).toBe(true);
    });
    it('fails when phase7FullyCertified is false', () => {
      const r = checkPhase7BoundaryPreserved({ boundaryReport: failingBoundary });
      expect(r.passed).toBe(false);
    });
    it('produces deterministic output', () => {
      const a = checkPhase7BoundaryPreserved({ boundaryReport: passingBoundary });
      const b = checkPhase7BoundaryPreserved({ boundaryReport: passingBoundary });
      expect(a).toEqual(b);
    });
  });
});
