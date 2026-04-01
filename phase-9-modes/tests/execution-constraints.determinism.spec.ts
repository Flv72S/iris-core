/**
 * Phase 9.2 — Execution constraints determinism tests
 */

import { describe, it, expect } from 'vitest';
import { resolveExecutionConstraints } from '../execution-constraints/execution-constraints.resolver';
import { hashExecutionConstraints } from '../execution-constraints/execution-constraints.hash';
import type { BehaviorMode } from '../definition/mode.types';

const MODES: BehaviorMode[] = ['DEFAULT', 'FOCUS', 'WELLBEING'];

describe('Execution constraints determinism', () => {
  it('hash is stable for same constraints', () => {
    const c = resolveExecutionConstraints('DEFAULT');
    const h1 = hashExecutionConstraints(c);
    const h2 = hashExecutionConstraints(c);
    expect(h1).toBe(h2);
  });

  it('resolver is deterministic', () => {
    for (const mode of MODES) {
      const a = resolveExecutionConstraints(mode);
      const b = resolveExecutionConstraints(mode);
      expect(a).toEqual(b);
      expect(a.maxActions).toBe(b.maxActions);
      expect(a.metadata.derivedFromMode).toBe(b.metadata.derivedFromMode);
    }
  });

  it('same mode produces same output', () => {
    const c1 = resolveExecutionConstraints('FOCUS');
    const c2 = resolveExecutionConstraints('FOCUS');
    expect(c1.maxActions).toBe(c2.maxActions);
    expect(c1.allowParallelActions).toBe(c2.allowParallelActions);
    expect(hashExecutionConstraints(c1)).toBe(hashExecutionConstraints(c2));
  });

  it('output is immutable', () => {
    const c = resolveExecutionConstraints('DEFAULT');
    expect(Object.isFrozen(c)).toBe(true);
    expect(Object.isFrozen(c.metadata)).toBe(true);
  });
});
