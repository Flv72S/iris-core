/**
 * Phase 10.1 — Decision Trace Builder (no inference, no omission, fixed order)
 */

import type { DecisionTrace, DecisionTraceStep, ProductBehaviorMode } from './decision-trace.types';
import { computeDecisionTraceHash } from './decision-trace.hash';

export interface BuildDecisionTraceInput {
  readonly traceId: string;
  readonly timestamp: string;
  readonly resolvedState: Readonly<{ summary: string }>;
  readonly executionPlan: Readonly<Record<string, unknown>>;
  readonly executionResult: Readonly<{ success: boolean }>;
  readonly outcomeLogSnapshot: Readonly<{ finalHash: string; entries: readonly unknown[] }>;
  readonly activeMode: ProductBehaviorMode;
}

const PHASES: DecisionTraceStep['phase'][] = [
  'SIGNAL',
  'STATE',
  'RESOLUTION',
  'MODE',
  'EXECUTION',
  'OUTCOME',
];

function hashInput(v: unknown): string {
  const s = JSON.stringify(v, Object.keys(v as object).sort());
  if (typeof process !== 'undefined' && process.versions?.node) {
    const crypto = require('node:crypto');
    return crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  }
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(16);
}

export function buildDecisionTrace(input: BuildDecisionTraceInput): DecisionTrace {
  const resolutionSummary = input.resolvedState.summary;
  const executionSummary = input.executionResult.success ? 'EXECUTION_SUCCESS' : 'EXECUTION_FAILED';
  const outcomeSummary = `OUTCOME_LOG_FINAL_HASH:${input.outcomeLogSnapshot.finalHash}`;

  const steps: DecisionTraceStep[] = [
    Object.freeze({
      stepIndex: 0,
      phase: 'SIGNAL',
      inputSnapshotHash: hashInput({ phase: 'SIGNAL' }),
      appliedRuleOrPolicy: 'SIGNAL_INPUT',
      result: 'CAPTURED',
    }),
    Object.freeze({
      stepIndex: 1,
      phase: 'STATE',
      inputSnapshotHash: hashInput(input.resolvedState),
      appliedRuleOrPolicy: 'STATE_RESOLVED',
      result: resolutionSummary,
    }),
    Object.freeze({
      stepIndex: 2,
      phase: 'RESOLUTION',
      inputSnapshotHash: hashInput(input.resolvedState),
      appliedRuleOrPolicy: 'RESOLUTION_APPLIED',
      result: resolutionSummary,
    }),
    Object.freeze({
      stepIndex: 3,
      phase: 'MODE',
      inputSnapshotHash: hashInput({ mode: input.activeMode }),
      appliedRuleOrPolicy: 'MODE_ACTIVE',
      result: input.activeMode,
    }),
    Object.freeze({
      stepIndex: 4,
      phase: 'EXECUTION',
      inputSnapshotHash: hashInput(input.executionPlan),
      appliedRuleOrPolicy: 'EXECUTION_PLAN',
      result: executionSummary,
    }),
    Object.freeze({
      stepIndex: 5,
      phase: 'OUTCOME',
      inputSnapshotHash: input.outcomeLogSnapshot.finalHash,
      appliedRuleOrPolicy: 'OUTCOME_LOG_APPEND',
      result: outcomeSummary,
    }),
  ];

  const traceWithoutHash: Omit<DecisionTrace, 'traceHash'> = {
    traceId: input.traceId,
    timestamp: input.timestamp,
    mode: input.activeMode,
    resolutionSummary,
    executionSummary,
    outcomeSummary,
    steps: Object.freeze(steps) as readonly DecisionTraceStep[],
  };

  const traceHash = computeDecisionTraceHash(traceWithoutHash);

  return Object.freeze({
    ...traceWithoutHash,
    traceHash,
  });
}
