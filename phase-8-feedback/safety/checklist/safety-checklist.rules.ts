/**
 * Phase 8 — Safety Checklist Rules (pure, deterministic)
 */

import type {
  SafetyCheckId,
  SafetyCheckResult,
  Phase7BoundaryReport,
  Phase8ExecutionMetadata,
  ReplayResult,
} from './safety-checklist.types';

export function checkNoSignalLayerWrite(input: {
  boundaryReport: Phase7BoundaryReport;
}): SafetyCheckResult {
  const passed = input.boundaryReport.signalLayerIsolation === true;
  return Object.freeze({
    checkId: 'NO_SIGNAL_LAYER_WRITE',
    passed,
    details: passed ? undefined : 'Signal layer write detected or not isolated',
  });
}

export function checkNoPreferenceMutation(input: {
  boundaryReport: Phase7BoundaryReport;
}): SafetyCheckResult {
  const passed = input.boundaryReport.preferenceImmutability === true;
  return Object.freeze({
    checkId: 'NO_PREFERENCE_MUTATION',
    passed,
    details: passed ? undefined : 'Preference mutation detected',
  });
}

export function checkNoImplicitLearning(input: {
  boundaryReport: Phase7BoundaryReport;
}): SafetyCheckResult {
  const passed = input.boundaryReport.learningInactive === true;
  return Object.freeze({
    checkId: 'NO_IMPLICIT_LEARNING',
    passed,
    details: passed ? undefined : 'Learning activation detected',
  });
}

export function checkDeterministicOutput(input: {
  executionMetadata: Phase8ExecutionMetadata;
}): SafetyCheckResult {
  const passed = input.executionMetadata.deterministicOutput === true;
  return Object.freeze({
    checkId: 'DETERMINISTIC_OUTPUT',
    passed,
    details: passed ? undefined : 'Execution not deterministic',
  });
}

export function checkReplaySafe(input: { replayResult?: ReplayResult }): SafetyCheckResult {
  if (input.replayResult === undefined) {
    return Object.freeze({
      checkId: 'REPLAY_SAFE',
      passed: true,
      details: 'No replay run; check not applicable',
    });
  }
  const passed =
    input.replayResult.success === true &&
    input.replayResult.deterministicMatch === true;
  return Object.freeze({
    checkId: 'REPLAY_SAFE',
    passed,
    details: passed ? undefined : 'Replay failed or non-deterministic',
  });
}

export function checkStateIsolated(input: {
  executionMetadata: Phase8ExecutionMetadata;
}): SafetyCheckResult {
  const passed = input.executionMetadata.stateMutations === 0;
  return Object.freeze({
    checkId: 'STATE_ISOLATED',
    passed,
    details: passed ? undefined : `stateMutations=${input.executionMetadata.stateMutations}`,
  });
}

export function checkPhase7BoundaryPreserved(input: {
  boundaryReport: Phase7BoundaryReport;
}): SafetyCheckResult {
  const passed = input.boundaryReport.phase7FullyCertified === true;
  return Object.freeze({
    checkId: 'PHASE_7_BOUNDARY_PRESERVED',
    passed,
    details: passed ? undefined : 'Phase 7 boundary not fully certified',
  });
}

const CHECK_ORDER: SafetyCheckId[] = [
  'NO_SIGNAL_LAYER_WRITE',
  'NO_PREFERENCE_MUTATION',
  'NO_IMPLICIT_LEARNING',
  'DETERMINISTIC_OUTPUT',
  'REPLAY_SAFE',
  'STATE_ISOLATED',
  'PHASE_7_BOUNDARY_PRESERVED',
];

export function getCheckOrder(): readonly SafetyCheckId[] {
  return CHECK_ORDER;
}
