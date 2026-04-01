/**
 * Phase 8 — Safety Checklist integration tests
 *
 * Integrazione con contratti Boundary Attestation (Phase 7.F) e Outcome Classification (8.1.2).
 * Nessun import da Phase 7 runtime; uso di fixture e Outcome Classification Phase 8.
 */

import { describe, it, expect } from 'vitest';
import { runSafetyChecklist } from '../checklist/safety-checklist.engine';
import { summarizeSafetyChecklist } from '../checklist/safety-checklist.report';
import { createActionOutcome } from '../../outcome/model/outcome.factory';
import { classifyOutcome } from '../../outcome/classification/outcome-classification.engine';

describe('Safety checklist integration', () => {
  it('accepts Phase 7.F-shaped boundary report and runs checklist', () => {
    const boundaryReport = {
      signalLayerIsolation: true,
      preferenceImmutability: true,
      learningInactive: true,
      phase7FullyCertified: true,
    };
    const result = runSafetyChecklist({
      checklistVersion: '1.0',
      timestamp: '2025-01-15T10:00:00.000Z',
      boundaryReport,
      executionMetadata: { deterministicOutput: true, stateMutations: 0 },
    });
    expect(result.fullySafe).toBe(true);
    expect(result.checklistVersion).toBe('1.0');
    expect(result.timestamp).toBe('2025-01-15T10:00:00.000Z');
  });

  it('summarizeSafetyChecklist returns failedChecks when not fully safe', () => {
    const result = runSafetyChecklist({
      checklistVersion: '1.0',
      timestamp: '2025-01-15T10:00:00.000Z',
      boundaryReport: {
        signalLayerIsolation: false,
        preferenceImmutability: true,
        learningInactive: true,
        phase7FullyCertified: false,
      },
      executionMetadata: { deterministicOutput: true, stateMutations: 0 },
    });
    const summary = summarizeSafetyChecklist(result);
    expect(summary.fullySafe).toBe(false);
    expect(summary.failedChecks.length).toBeGreaterThan(0);
    expect(summary.failedChecks).toContain('NO_SIGNAL_LAYER_WRITE');
    expect(summary.failedChecks).toContain('PHASE_7_BOUNDARY_PRESERVED');
  });

  it('integration with Outcome Classification 8.1.2: deterministic flow then checklist', () => {
    const outcome = createActionOutcome({
      id: 'out-1',
      actionIntentId: 'intent-1',
      status: 'SUCCESS',
      source: 'EXECUTION_RUNTIME',
      timestamp: 1000,
    });
    const classification = classifyOutcome(outcome);
    expect(classification.semanticClass).toBe('POSITIVE');

    const result = runSafetyChecklist({
      checklistVersion: '1.0',
      timestamp: '2025-01-15T10:00:00.000Z',
      boundaryReport: {
        signalLayerIsolation: true,
        preferenceImmutability: true,
        learningInactive: true,
        phase7FullyCertified: true,
      },
      executionMetadata: { deterministicOutput: true, stateMutations: 0 },
    });
    expect(result.fullySafe).toBe(true);
  });

  it('REPLAY_SAFE: simulation with replayResult success and deterministicMatch', () => {
    const result = runSafetyChecklist({
      checklistVersion: '1.0',
      timestamp: '2025-01-15T10:00:00.000Z',
      boundaryReport: {
        signalLayerIsolation: true,
        preferenceImmutability: true,
        learningInactive: true,
        phase7FullyCertified: true,
      },
      executionMetadata: { deterministicOutput: true, stateMutations: 0 },
      replayResult: { success: true, deterministicMatch: true },
    });
    const replayCheck = result.results.find((r) => r.checkId === 'REPLAY_SAFE');
    expect(replayCheck?.passed).toBe(true);
    expect(result.fullySafe).toBe(true);
  });

  it('REPLAY_SAFE: simulation with replayResult failure', () => {
    const result = runSafetyChecklist({
      checklistVersion: '1.0',
      timestamp: '2025-01-15T10:00:00.000Z',
      boundaryReport: {
        signalLayerIsolation: true,
        preferenceImmutability: true,
        learningInactive: true,
        phase7FullyCertified: true,
      },
      executionMetadata: { deterministicOutput: true, stateMutations: 0 },
      replayResult: { success: false, deterministicMatch: false },
    });
    const replayCheck = result.results.find((r) => r.checkId === 'REPLAY_SAFE');
    expect(replayCheck?.passed).toBe(false);
    expect(result.fullySafe).toBe(false);
  });
});
