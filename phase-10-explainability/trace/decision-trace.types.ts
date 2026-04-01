/**
 * Phase 10.1 — Decision Trace (readonly, deterministic, audit-only)
 */

export type DecisionTracePhase =
  | 'SIGNAL'
  | 'STATE'
  | 'RESOLUTION'
  | 'MODE'
  | 'EXECUTION'
  | 'OUTCOME';

export type ProductBehaviorMode = 'DEFAULT' | 'FOCUS' | 'WELLBEING';

export interface DecisionTraceStep {
  readonly stepIndex: number;
  readonly phase: DecisionTracePhase;
  readonly inputSnapshotHash: string;
  readonly appliedRuleOrPolicy: string;
  readonly result: string;
  readonly notes?: string;
}

export interface DecisionTrace {
  readonly traceId: string;
  readonly timestamp: string;
  readonly mode: ProductBehaviorMode;
  readonly resolutionSummary: string;
  readonly executionSummary: string;
  readonly outcomeSummary: string;
  readonly steps: readonly DecisionTraceStep[];
  readonly traceHash: string;
}
