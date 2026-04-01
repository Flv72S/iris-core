import { describe, it, expect } from 'vitest';
import { resolveExecutionConstraints } from '../execution-constraints/execution-constraints.resolver';
import type { BehaviorMode } from '../definition/mode.types';

const MODES: BehaviorMode[] = ['DEFAULT', 'FOCUS', 'WELLBEING'];

describe('Execution constraints', () => {
  it('every mode produces valid constraints', () => {
    for (const mode of MODES) {
      const c = resolveExecutionConstraints(mode);
      expect(c.maxActions !== undefined).toBe(true);
      expect(typeof c.allowParallelActions).toBe('boolean');
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(c.interruptionTolerance);
      expect(typeof c.proactiveActionAllowed).toBe('boolean');
    }
  });

  it('no field undefined', () => {
    for (const mode of MODES) {
      const c = resolveExecutionConstraints(mode);
      expect(c.metadata).toBeDefined();
      expect(c.metadata.derivedFromMode).toBe(mode);
    }
  });

  it('WELLBEING does not allow proactive actions', () => {
    expect(resolveExecutionConstraints('WELLBEING').proactiveActionAllowed).toBe(false);
  });

  it('FOCUS limits actions and parallelism', () => {
    const c = resolveExecutionConstraints('FOCUS');
    expect(c.maxActions).toBe(1);
    expect(c.allowParallelActions).toBe(false);
  });
});
