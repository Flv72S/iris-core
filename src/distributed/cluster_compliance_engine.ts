import type { InvariantResult } from './cluster_invariant_engine';
import type { BarrierViolation } from './phase_barrier_engine';

export type ClusterPhase =
  | 'INITIALIZING'
  | 'PARTIAL'
  | 'SYNCING'
  | 'READY'
  | 'RUNNING'
  | 'DEGRADED'
  | 'HALTED'
  | 'STOPPING'
  | 'STOPPED'
  | 'FAILED';

export interface InvariantEvaluationLike {
  readonly id: string;
  readonly result: InvariantResult;
  readonly reason?: string;
}

export interface ClusterStateComplianceInput {
  readonly globalPhase: ClusterPhase;
  readonly overallCompliance?: InvariantResult;
  readonly violations?: readonly BarrierViolation[];
  readonly invariants?: readonly InvariantEvaluationLike[];
}

export type ComplianceSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export type ComplianceActionType =
  | 'NO_OP'
  | 'LOG_ONLY'
  | 'ESCALATE'
  | 'HALT_CLUSTER'
  | 'FREEZE_TRANSITIONS'
  | 'REQUIRE_MANUAL_INTERVENTION';

export interface ComplianceDecision {
  readonly severity: ComplianceSeverity;
  readonly action: ComplianceActionType;
  readonly reasons: readonly string[];
  readonly invariantIds: readonly string[];
  readonly violationCount: number;
  readonly timestamp: number;
}

export interface CompliancePolicy {
  readonly id: string;
  readonly description: string;
  evaluate(input: {
    cluster: ClusterStateComplianceInput;
    overallCompliance?: InvariantResult;
    violations?: readonly BarrierViolation[];
  }): ComplianceDecision;
}

const severityRank: Readonly<Record<ComplianceSeverity, number>> = {
  INFO: 0,
  WARNING: 1,
  CRITICAL: 2,
};

const actionRank: Readonly<Record<ComplianceActionType, number>> = {
  NO_OP: 0,
  LOG_ONLY: 1,
  ESCALATE: 2,
  FREEZE_TRANSITIONS: 3,
  HALT_CLUSTER: 4,
  REQUIRE_MANUAL_INTERVENTION: 5,
};

function makeDecision(
  severity: ComplianceSeverity,
  action: ComplianceActionType,
  reasons: readonly string[] = Object.freeze([]),
  invariantIds: readonly string[] = Object.freeze([]),
): ComplianceDecision {
  return Object.freeze({
    severity,
    action,
    reasons: Object.freeze([...reasons]),
    invariantIds: Object.freeze([...new Set(invariantIds)].sort()),
    violationCount: 0,
    timestamp: 0,
  });
}

const CRITICAL_INVARIANTS = new Set(['cluster.temporal_consistency', 'cluster.no_illegal_transition_residue']);

export const COMPLIANCE_POLICIES: readonly CompliancePolicy[] = Object.freeze([
  {
    id: 'policy.all_good',
    description: 'All compliant with no violations',
    evaluate: ({ overallCompliance, violations }) =>
      overallCompliance === 'COMPLIANT' && (violations?.length ?? 0) === 0
        ? makeDecision('INFO', 'NO_OP', ['cluster compliant; no violations'])
        : makeDecision('INFO', 'NO_OP'),
  },
  {
    id: 'policy.warning_state',
    description: 'Unknown compliance or low-grade violations',
    evaluate: ({ overallCompliance, violations }) =>
      overallCompliance === 'UNKNOWN' || ((violations?.length ?? 0) > 0 && (violations?.length ?? 0) < 3)
        ? makeDecision('WARNING', 'LOG_ONLY', ['unknown compliance or low barrier violations'])
        : makeDecision('INFO', 'NO_OP'),
  },
  {
    id: 'policy.non_compliant',
    description: 'Non-compliant aggregate state',
    evaluate: ({ overallCompliance }) =>
      overallCompliance === 'NON_COMPLIANT'
        ? makeDecision('CRITICAL', 'ESCALATE', ['overall compliance is NON_COMPLIANT'])
        : makeDecision('INFO', 'NO_OP'),
  },
  {
    id: 'policy.critical_failure_override',
    description: 'Cluster FAILED must halt',
    evaluate: ({ cluster }) =>
      cluster.globalPhase === 'FAILED'
        ? makeDecision('CRITICAL', 'HALT_CLUSTER', ['cluster phase FAILED requires immediate halt'])
        : makeDecision('INFO', 'NO_OP'),
  },
  {
    id: 'policy.barrier_violation_escalation',
    description: 'Freeze transitions when barrier violations are excessive',
    evaluate: ({ violations }) =>
      (violations?.length ?? 0) >= 3
        ? makeDecision('CRITICAL', 'FREEZE_TRANSITIONS', [`barrier violations above threshold: ${violations?.length ?? 0}`])
        : makeDecision('INFO', 'NO_OP'),
  },
  {
    id: 'policy.invariant_critical_set',
    description: 'Critical invariants require manual intervention',
    evaluate: ({ cluster }): ComplianceDecision => {
      const violated = (cluster.invariants ?? [])
        .filter((x) => x.result === 'NON_COMPLIANT' && CRITICAL_INVARIANTS.has(x.id))
        .map((x) => x.id)
        .sort();
      if (violated.length === 0) return makeDecision('INFO', 'NO_OP');
      return makeDecision(
        'CRITICAL',
        'REQUIRE_MANUAL_INTERVENTION',
        ['critical invariant violation set detected'],
        violated,
      );
    },
  },
]);

function stronger(a: ComplianceDecision, b: ComplianceDecision): ComplianceDecision {
  const sa = severityRank[a.severity];
  const sb = severityRank[b.severity];
  if (sa !== sb) return sa > sb ? a : b;
  const aa = actionRank[a.action];
  const ab = actionRank[b.action];
  return aa >= ab ? a : b;
}

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

/**
 * Deterministic policy evaluation.
 * `now` is explicit to preserve replay invariance; default is stable `0`.
 */
export function evaluateCompliance(cluster: ClusterStateComplianceInput, now = 0): ComplianceDecision {
  const evaluated = COMPLIANCE_POLICIES.map((p) => p.evaluate({
    cluster,
    overallCompliance: cluster.overallCompliance,
    violations: cluster.violations,
  }));
  const selected = evaluated.reduce((best, cur) => stronger(best, cur), makeDecision('INFO', 'NO_OP'));
  const winners = evaluated.filter((d) => d.severity === selected.severity && d.action === selected.action);
  const reasons = uniqueSorted(winners.flatMap((d) => d.reasons));
  const invariantIds = uniqueSorted(winners.flatMap((d) => d.invariantIds));
  return Object.freeze({
    severity: selected.severity,
    action: selected.action,
    reasons,
    invariantIds,
    violationCount: cluster.violations?.length ?? 0,
    timestamp: now,
  });
}

/** Deterministic strongest-first canonical order for executor layer. */
export const CANONICAL_ACTION_ORDER: readonly ComplianceActionType[] = Object.freeze([
  'HALT_CLUSTER',
  'FREEZE_TRANSITIONS',
  'REQUIRE_MANUAL_INTERVENTION',
  'ESCALATE',
  'LOG_ONLY',
  'NO_OP',
]);
