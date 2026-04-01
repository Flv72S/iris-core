/**
 * Phase 8 Certification — Execution harness (full pipeline, no side-effects)
 */

import type { ActionOutcome } from '../../../phase-8-feedback/outcome/model/outcome.types';
import type { SafetyRule } from '../../../phase-8-feedback/safety/rules/safety-rule.types';
import type { Phase7BoundaryReport } from '../../../phase-8-feedback/safety/checklist/safety-checklist.types';
import type { OutcomeLogSnapshot } from '../../../phase-8-feedback/outcome/persistence/outcome-log.types';
import type { SafetyEvaluationResult } from '../../../phase-8-feedback/safety/evaluation/safety-evaluation.types';
import type { SafetyChecklistVerdict } from '../../../phase-8-feedback/safety/checklist/safety-checklist.types';
import type { BoundaryEscalationEvent } from '../../../phase-8-feedback/boundary/escalation/boundary-escalation.types';
import type { BoundaryAttestationSnapshot } from '../../../phase-8-feedback/boundary/escalation/boundary-attestation.snapshot';

import { replayOutcomeLog } from '../../../phase-8-feedback/outcome/persistence/outcome-log.replay';
import { evaluateSafetyRules } from '../../../phase-8-feedback/safety/evaluation/safety-rule-evaluator';
import { aggregateSafetyEvaluations } from '../../../phase-8-feedback/safety/checklist/safety-checklist.aggregator';
import { createBoundaryEscalationEvent } from '../../../phase-8-feedback/boundary/escalation/boundary-escalation.bridge';
import { createBoundaryAttestationSnapshot } from '../../../phase-8-feedback/boundary/escalation/boundary-attestation.snapshot';

export interface Phase8ExecutionResult {
  readonly outcomeSnapshot: OutcomeLogSnapshot;
  readonly safetyEvaluation: SafetyEvaluationResult;
  readonly checklistVerdict: SafetyChecklistVerdict;
  readonly escalationEvent: BoundaryEscalationEvent;
  readonly attestationSnapshot: BoundaryAttestationSnapshot;
}

export function executePhase8Pipeline(
  outcomes: readonly ActionOutcome[],
  rules: readonly SafetyRule[],
  boundaryReport: Phase7BoundaryReport
): Phase8ExecutionResult {
  const outcomeSnapshot = replayOutcomeLog(outcomes);
  const safetyEvaluation = evaluateSafetyRules(rules, outcomes);
  const checklistVerdict = aggregateSafetyEvaluations(safetyEvaluation.evaluations);
  const escalationEvent = createBoundaryEscalationEvent(checklistVerdict);
  const attestationSnapshot = createBoundaryAttestationSnapshot(escalationEvent, boundaryReport);

  return Object.freeze({
    outcomeSnapshot,
    safetyEvaluation,
    checklistVerdict,
    escalationEvent,
    attestationSnapshot,
  });
}
