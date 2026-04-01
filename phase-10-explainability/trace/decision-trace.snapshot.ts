/**
 * Phase 10.1 — Trace snapshot for replay and forensic comparison
 */

import type { DecisionTrace } from './decision-trace.types';

export type DecisionTraceSnapshot = DecisionTrace;

export function createDecisionTraceSnapshot(trace: DecisionTrace): DecisionTraceSnapshot {
  return trace;
}

export function snapshotFromTrace(trace: DecisionTrace): Readonly<DecisionTrace> {
  return Object.freeze(JSON.parse(JSON.stringify(trace)));
}
