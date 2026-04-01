/**
 * Phase 8.2.1 — Static deterministic catalog of safety rules (declarative only)
 */

import type { SafetyRule } from './safety-rule.types';
import { computeSafetyRuleHash } from './safety-rule.hash';

function buildRule(
  rule: Omit<SafetyRule, 'deterministicHash'>
): SafetyRule {
  const deterministicHash = computeSafetyRuleHash(rule);
  return Object.freeze({ ...rule, deterministicHash });
}

const NO_CRITICAL_FAILURE = buildRule({
  id: 'NO_CRITICAL_FAILURE',
  version: '1.0.0',
  description: 'No FAILED outcome with CRITICAL severity allowed',
  severity: 'CRITICAL',
  scope: 'SINGLE_OUTCOME',
  parameters: Object.freeze({ forbiddenStatus: 'FAILED' }),
});

const NO_FAILURE_CASCADE = buildRule({
  id: 'NO_FAILURE_CASCADE',
  version: '1.0.0',
  description: 'No more than N FAILED outcomes in a sequence',
  severity: 'WARNING',
  scope: 'OUTCOME_SEQUENCE',
  parameters: Object.freeze({ maxFailures: 3 }),
});

export const SAFETY_RULE_CATALOG: readonly SafetyRule[] = Object.freeze([
  NO_CRITICAL_FAILURE,
  NO_FAILURE_CASCADE,
]);
