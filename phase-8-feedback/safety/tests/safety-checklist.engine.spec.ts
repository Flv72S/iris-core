import { describe, it, expect } from 'vitest';
import { runSafetyChecklist } from '../checklist/safety-checklist.engine';
import { getCheckOrder } from '../checklist/safety-checklist.rules';

const passingBoundary = {
  signalLayerIsolation: true,
  preferenceImmutability: true,
  learningInactive: true,
  phase7FullyCertified: true,
};

const passingMetadata = { deterministicOutput: true, stateMutations: 0 };

const failingBoundary = {
  signalLayerIsolation: false,
  preferenceImmutability: false,
  learningInactive: false,
  phase7FullyCertified: false,
};

describe('Safety checklist engine', () => {
  it('fullySafe is true when all checks pass', () => {
    const result = runSafetyChecklist({
      checklistVersion: '1.0',
      timestamp: '2025-01-15T10:00:00.000Z',
      boundaryReport: passingBoundary,
      executionMetadata: passingMetadata,
    });
    expect(result.fullySafe).toBe(true);
    expect(result.results.every((r) => r.passed)).toBe(true);
  });

  it('fullySafe is false when at least one check fails', () => {
    const result = runSafetyChecklist({
      checklistVersion: '1.0',
      timestamp: '2025-01-15T10:00:00.000Z',
      boundaryReport: failingBoundary,
      executionMetadata: passingMetadata,
    });
    expect(result.fullySafe).toBe(false);
    expect(result.results.some((r) => !r.passed)).toBe(true);
  });

  it('fullySafe is false when execution metadata violates', () => {
    const result = runSafetyChecklist({
      checklistVersion: '1.0',
      timestamp: '2025-01-15T10:00:00.000Z',
      boundaryReport: passingBoundary,
      executionMetadata: { deterministicOutput: false, stateMutations: 0 },
    });
    expect(result.fullySafe).toBe(false);
  });

  it('result order is stable and matches getCheckOrder', () => {
    const result = runSafetyChecklist({
      checklistVersion: '1.0',
      timestamp: '2025-01-15T10:00:00.000Z',
      boundaryReport: passingBoundary,
      executionMetadata: passingMetadata,
    });
    const order = getCheckOrder();
    expect(result.results.length).toBe(order.length);
    result.results.forEach((r, i) => expect(r.checkId).toBe(order[i]));
  });

  it('output is immutable', () => {
    const result = runSafetyChecklist({
      checklistVersion: '1.0',
      timestamp: '2025-01-15T10:00:00.000Z',
      boundaryReport: passingBoundary,
      executionMetadata: passingMetadata,
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.results)).toBe(true);
    result.results.forEach((r) => expect(Object.isFrozen(r)).toBe(true));
  });

  it('replayResult optional: fullySafe true without replay', () => {
    const result = runSafetyChecklist({
      checklistVersion: '1.0',
      timestamp: '2025-01-15T10:00:00.000Z',
      boundaryReport: passingBoundary,
      executionMetadata: passingMetadata,
    });
    expect(result.fullySafe).toBe(true);
  });

  it('replayResult passing: fullySafe true', () => {
    const result = runSafetyChecklist({
      checklistVersion: '1.0',
      timestamp: '2025-01-15T10:00:00.000Z',
      boundaryReport: passingBoundary,
      executionMetadata: passingMetadata,
      replayResult: { success: true, deterministicMatch: true },
    });
    expect(result.fullySafe).toBe(true);
  });

  it('replayResult failing: fullySafe false', () => {
    const result = runSafetyChecklist({
      checklistVersion: '1.0',
      timestamp: '2025-01-15T10:00:00.000Z',
      boundaryReport: passingBoundary,
      executionMetadata: passingMetadata,
      replayResult: { success: false, deterministicMatch: true },
    });
    expect(result.fullySafe).toBe(false);
  });
});
