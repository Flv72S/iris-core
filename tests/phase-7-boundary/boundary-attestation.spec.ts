/**
 * Phase 7.F — Boundary Attestation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetSignalLayerWriteDetector,
  getSignalLayerBoundaryResult,
} from './detectors/signal-layer-write-detector';
import {
  setPreferenceBaseline,
  comparePreferenceToBaseline,
  resetPreferenceMutationDetector,
} from './detectors/preference-mutation-detector';
import {
  resetLearningActivationDetector,
  getLearningBoundaryResult,
} from './detectors/learning-activation-detector';
import { runExecutionHarness } from '../phase-7/harness/execution-harness';
import { RESOLVED_ALLOWED } from '../phase-7/fixtures/resolution-states';
import { FOCUS_NOTIFICATION } from '../phase-7/fixtures/action-intents';
import { produceBoundaryReport } from './boundary-report';

const NOW = new Date('2025-01-15T10:00:00.000Z').getTime();

function runPhase7RepresentativeExecution(): void {
  runExecutionHarness({
    resolution: RESOLVED_ALLOWED,
    intentFixture: FOCUS_NOTIFICATION,
    nowMs: NOW,
  });
}

describe('Phase 7.F — Boundary Attestation', () => {
  beforeEach(() => {
    resetSignalLayerWriteDetector();
    resetPreferenceMutationDetector();
    resetLearningActivationDetector();
  });

  it('signal layer: no writes during Phase 7 execution', () => {
    setPreferenceBaseline({});
    runPhase7RepresentativeExecution();
    const result = getSignalLayerBoundaryResult();
    expect(result.writesDetected).toBe(0);
    expect(result.passed).toBe(true);
  });

  it('preferences: no mutation during Phase 7 execution', () => {
    const baseline = { phase7Boundary: true };
    setPreferenceBaseline(baseline);
    runPhase7RepresentativeExecution();
    const result = comparePreferenceToBaseline(baseline);
    expect(result.mutated).toBe(false);
    expect(result.passed).toBe(true);
  });

  it('learning: no activations during Phase 7 execution', () => {
    runPhase7RepresentativeExecution();
    const result = getLearningBoundaryResult();
    expect(result.activations).toBe(0);
    expect(result.passed).toBe(true);
  });

  it('all three boundary conditions pass', () => {
    const baseline = {};
    setPreferenceBaseline(baseline);
    runPhase7RepresentativeExecution();
    expect(getSignalLayerBoundaryResult().passed).toBe(true);
    expect(comparePreferenceToBaseline(baseline).passed).toBe(true);
    expect(getLearningBoundaryResult().passed).toBe(true);
  });

  it('boundary report: phase7FullyCertified is true', () => {
    const report = produceBoundaryReport();
    expect(report.signalLayerIsolation).toBe(true);
    expect(report.preferenceImmutability).toBe(true);
    expect(report.learningInactive).toBe(true);
    expect(report.phase7FullyCertified).toBe(true);
  });
});
