import crypto from 'node:crypto';

import type { ComplianceDecision } from '../cluster_compliance_engine';
import { canonicalizeKeysDeep, stableStringify } from '../../logging/audit';
import { compareActions } from './compliance_lattice';

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function deriveDecisionId(decision: ComplianceDecision): string {
  const body = canonicalizeKeysDeep({
    severity: decision.severity,
    action: decision.action,
    invariantIds: [...decision.invariantIds].sort(),
    reasons: [...decision.reasons].sort(),
    timestamp: decision.timestamp,
  });
  const digest = crypto.createHash('sha256').update(stableStringify(body), 'utf8').digest('hex');
  return `CMP:${digest}`;
}

/**
 * Deterministic conflict resolver over two compliance decisions.
 * Tie-break policy:
 * 1) highest action lattice priority
 * 2) lower timestamp wins (earlier causal decision)
 * 3) lexicographically higher decisionId wins
 */
export function resolveComplianceConflict(a: ComplianceDecision, b: ComplianceDecision): ComplianceDecision {
  const idA = deriveDecisionId(a);
  const idB = deriveDecisionId(b);
  if (idA === idB) return a;

  const actionCmp = compareActions(a.action, b.action);
  let winner = actionCmp > 0 ? a : actionCmp < 0 ? b : undefined;
  if (winner === undefined) {
    if (a.timestamp !== b.timestamp) {
      winner = a.timestamp < b.timestamp ? a : b;
    } else {
      winner = idA >= idB ? a : b;
    }
  }

  const loser = winner === a ? b : a;
  return Object.freeze({
    severity: winner.severity,
    action: winner.action,
    reasons: uniqueSorted([...winner.reasons, ...loser.reasons]),
    invariantIds: uniqueSorted([...winner.invariantIds, ...loser.invariantIds]),
    violationCount: Math.max(winner.violationCount, loser.violationCount),
    timestamp: Math.min(a.timestamp, b.timestamp),
  });
}

export function resolveComplianceSet(decisions: readonly ComplianceDecision[]): ComplianceDecision | undefined {
  if (decisions.length === 0) return undefined;
  return decisions.reduce((acc, cur) => resolveComplianceConflict(acc, cur));
}

export function areComplianceDecisionsEquivalent(a: ComplianceDecision, b: ComplianceDecision): boolean {
  return stableStringify({
    ...a,
    reasons: [...a.reasons].sort(),
    invariantIds: [...a.invariantIds].sort(),
  }) ===
    stableStringify({
      ...b,
      reasons: [...b.reasons].sort(),
      invariantIds: [...b.invariantIds].sort(),
    });
}
