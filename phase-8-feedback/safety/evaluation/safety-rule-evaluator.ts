/**
 * Phase 8.2.2 — Safety Rule Evaluation Engine (deterministic, no side-effects)
 */

import type { ActionOutcome } from '../../outcome/model/outcome.types';
import type { SafetyRule } from '../rules/safety-rule.types';
import type { SafetyRuleEvaluation, SafetyEvaluationResult } from './safety-evaluation.types';
import { classifyOutcome } from '../../outcome/classification/outcome-classification.engine';
import { countFailedOutcomes } from './safety-evaluation.utils';

const CRITICAL_SEVERITY_THRESHOLD = 1;

function evaluateSingleOutcomeRule(
  rule: SafetyRule,
  outcomes: readonly ActionOutcome[]
): SafetyRuleEvaluation {
  const forbiddenStatus = rule.parameters['forbiddenStatus'] as string | undefined;
  if (outcomes.length === 0) {
    return Object.freeze({
      ruleId: rule.id,
      ruleVersion: rule.version,
      verdict: 'NOT_APPLICABLE',
      severity: rule.severity,
      explanation: 'No outcomes to evaluate',
    });
  }
  if (forbiddenStatus === undefined) {
    return Object.freeze({
      ruleId: rule.id,
      ruleVersion: rule.version,
      verdict: 'NOT_APPLICABLE',
      severity: rule.severity,
      explanation: 'Rule has no forbiddenStatus parameter',
    });
  }
  const criticalViolation = outcomes.some((outcome) => {
    if (outcome.status !== forbiddenStatus) return false;
    const classification = classifyOutcome(outcome);
    return classification.severity >= CRITICAL_SEVERITY_THRESHOLD;
  });
  if (criticalViolation) {
    const count = outcomes.filter((o) => o.status === forbiddenStatus).length;
    return Object.freeze({
      ruleId: rule.id,
      ruleVersion: rule.version,
      verdict: 'FAIL',
      severity: rule.severity,
      explanation: `Found ${count} outcome(s) with status ${forbiddenStatus} and critical severity`,
    });
  }
  return Object.freeze({
    ruleId: rule.id,
    ruleVersion: rule.version,
    verdict: 'PASS',
    severity: rule.severity,
    explanation: `No outcome with status ${forbiddenStatus} and critical severity`,
  });
}

function evaluateSequenceRule(
  rule: SafetyRule,
  outcomes: readonly ActionOutcome[]
): SafetyRuleEvaluation {
  const maxFailures = rule.parameters['maxFailures'] as number | undefined;
  if (outcomes.length === 0) {
    return Object.freeze({
      ruleId: rule.id,
      ruleVersion: rule.version,
      verdict: 'NOT_APPLICABLE',
      severity: rule.severity,
      explanation: 'Empty sequence; rule not applicable',
    });
  }
  if (maxFailures === undefined || typeof maxFailures !== 'number') {
    return Object.freeze({
      ruleId: rule.id,
      ruleVersion: rule.version,
      verdict: 'NOT_APPLICABLE',
      severity: rule.severity,
      explanation: 'Rule has no valid maxFailures parameter',
    });
  }
  const failedCount = countFailedOutcomes(outcomes);
  if (failedCount > maxFailures) {
    return Object.freeze({
      ruleId: rule.id,
      ruleVersion: rule.version,
      verdict: 'FAIL',
      severity: rule.severity,
      explanation: `Sequence has ${failedCount} FAILED outcome(s), max allowed is ${maxFailures}`,
    });
  }
  return Object.freeze({
    ruleId: rule.id,
    ruleVersion: rule.version,
    verdict: 'PASS',
    severity: rule.severity,
    explanation: `Sequence has ${failedCount} FAILED outcome(s), within limit of ${maxFailures}`,
  });
}

function evaluateRule(
  rule: SafetyRule,
  outcomes: readonly ActionOutcome[]
): SafetyRuleEvaluation {
  if (rule.scope === 'SINGLE_OUTCOME') {
    return evaluateSingleOutcomeRule(rule, outcomes);
  }
  if (rule.scope === 'OUTCOME_SEQUENCE') {
    return evaluateSequenceRule(rule, outcomes);
  }
  return Object.freeze({
    ruleId: rule.id,
    ruleVersion: rule.version,
    verdict: 'NOT_APPLICABLE',
    severity: rule.severity,
    explanation: `Unknown scope: ${rule.scope}`,
  });
}

export function evaluateSafetyRules(
  rules: readonly SafetyRule[],
  outcomes: readonly ActionOutcome[]
): SafetyEvaluationResult {
  const evaluations: SafetyRuleEvaluation[] = [];
  for (const rule of rules) {
    evaluations.push(evaluateRule(rule, outcomes));
  }
  const hasCriticalFailure = evaluations.some(
    (e) => e.verdict === 'FAIL' && e.severity === 'CRITICAL'
  );
  return Object.freeze({
    evaluations: Object.freeze(evaluations) as readonly SafetyRuleEvaluation[],
    hasCriticalFailure,
  });
}
