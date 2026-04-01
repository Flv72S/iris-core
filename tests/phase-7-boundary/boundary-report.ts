/**
 * Phase 7.F — Boundary Report
 *
 * Produce Phase7BoundaryReport: signalLayerIsolation, preferenceImmutability,
 * learningInactive, phase7FullyCertified.
 */

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

export type Phase7BoundaryReport = {
  readonly signalLayerIsolation: boolean;
  readonly preferenceImmutability: boolean;
  readonly learningInactive: boolean;
  readonly phase7FullyCertified: boolean;
};

const NOW = new Date('2025-01-15T10:00:00.000Z').getTime();

/**
 * Esegue un run rappresentativo della Phase 7 e produce il boundary report.
 */
export function produceBoundaryReport(): Phase7BoundaryReport {
  resetSignalLayerWriteDetector();
  resetPreferenceMutationDetector();
  resetLearningActivationDetector();

  const preferenceBaseline = {};
  setPreferenceBaseline(preferenceBaseline);

  runExecutionHarness({
    resolution: RESOLVED_ALLOWED,
    intentFixture: FOCUS_NOTIFICATION,
    nowMs: NOW,
  });

  const signalResult = getSignalLayerBoundaryResult();
  const preferenceResult = comparePreferenceToBaseline(preferenceBaseline);
  const learningResult = getLearningBoundaryResult();

  const signalLayerIsolation = signalResult.passed;
  const preferenceImmutability = preferenceResult.passed;
  const learningInactive = learningResult.passed;
  const phase7FullyCertified =
    signalLayerIsolation && preferenceImmutability && learningInactive;

  return Object.freeze({
    signalLayerIsolation,
    preferenceImmutability,
    learningInactive,
    phase7FullyCertified,
  });
}
