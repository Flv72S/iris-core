/**
 * Step 8B — Policy evaluator. Pure, deterministic evaluation against GovernanceTierSnapshot.
 */

import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { GovernanceTier } from '../../tiering/hysteresis.js';
import type { GovernancePolicy, PolicyOperator } from '../types/policy_types.js';

const TIER_ORDER: GovernanceTier[] = [
  'TIER_0_LOCKED',
  'TIER_1_RESTRICTED',
  'TIER_2_CONTROLLED',
  'TIER_3_STABLE',
  'TIER_4_ENTERPRISE_READY',
];

const TIER_ALIASES: Record<string, GovernanceTier> = {
  TIER_0: 'TIER_0_LOCKED',
  TIER_1: 'TIER_1_RESTRICTED',
  TIER_2: 'TIER_2_CONTROLLED',
  TIER_3: 'TIER_3_STABLE',
  TIER_4: 'TIER_4_ENTERPRISE_READY',
  TIER_0_LOCKED: 'TIER_0_LOCKED',
  TIER_1_RESTRICTED: 'TIER_1_RESTRICTED',
  TIER_2_CONTROLLED: 'TIER_2_CONTROLLED',
  TIER_3_STABLE: 'TIER_3_STABLE',
  TIER_4_ENTERPRISE_READY: 'TIER_4_ENTERPRISE_READY',
};

function tierToIndex(tier: GovernanceTier | string): number {
  const t = TIER_ALIASES[tier as string] ?? tier;
  const i = TIER_ORDER.indexOf(t as GovernanceTier);
  return i >= 0 ? i : 0;
}

function getFieldValue(snapshot: GovernanceTierSnapshot, field: string): number | string {
  switch (field) {
    case 'tier':
      return snapshot.tier;
    case 'score':
      return snapshot.score;
    case 'flipStability':
      return snapshot.normalizedMetrics.flipStability;
    case 'invariantIntegrity':
      return snapshot.normalizedMetrics.invariantIntegrity;
    case 'entropyControl':
      return snapshot.normalizedMetrics.entropyControl;
    case 'violationPressure':
      return snapshot.normalizedMetrics.violationPressure;
    default:
      throw new Error(`Unknown field: ${field}`);
  }
}

function compareNumbers(
  left: number,
  op: PolicyOperator,
  right: number
): boolean {
  switch (op) {
    case '<':
      return left < right;
    case '>':
      return left > right;
    case '<=':
      return left <= right;
    case '>=':
      return left >= right;
    case '==':
      return left === right;
    case '!=':
      return left !== right;
    default:
      return false;
  }
}

function compareTiers(
  leftTier: GovernanceTier,
  op: PolicyOperator,
  rightValue: string
): boolean {
  const leftIdx = tierToIndex(leftTier);
  const rightIdx = tierToIndex(rightValue);
  return compareNumbers(leftIdx, op, rightIdx);
}

/**
 * Evaluate a single policy against a tier snapshot. Returns true if the condition holds (policy active).
 */
export function evaluatePolicy(
  policy: GovernancePolicy,
  snapshot: GovernanceTierSnapshot
): boolean {
  const left = getFieldValue(snapshot, policy.condition.field);
  const op = policy.condition.operator;
  const right = policy.condition.value;

  if (policy.condition.field === 'tier') {
    return compareTiers(
      left as GovernanceTier,
      op,
      typeof right === 'string' ? right : String(right)
    );
  }

  const leftNum = typeof left === 'number' ? left : tierToIndex(left as string);
  const rightNum = typeof right === 'number' ? right : Number(right);
  if (!Number.isFinite(rightNum)) {
    return false;
  }
  return compareNumbers(leftNum, op, rightNum);
}
