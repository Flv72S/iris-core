/**
 * Phase 8.2.2 — Single-outcome evaluation tests
 */

import { describe, it, expect } from 'vitest';
import { createActionOutcome } from '../../outcome/model/outcome.factory';
import { SAFETY_RULE_CATALOG } from '../rules/safety-rule.catalog';
import { evaluateSafetyRules } from '../evaluation/safety-rule-evaluator';

const base = {
  actionIntentId: 'intent-1',
  source: 'EXECUTION_RUNTIME' as const,
  timestamp: 1000,
};

describe('Safety evaluator single outcome', () => {
  it('single outcome OK yields PASS for NO_CRITICAL_FAILURE', () => {
    const outcomes = [
      createActionOutcome({ ...base, id: 'o1', status: 'SUCCESS' }),
    ];
    const result = evaluateSafetyRules(SAFETY_RULE_CATALOG, outcomes);
    const singleRule = result.evaluations.find((e) => e.ruleId === 'NO_CRITICAL_FAILURE');
    expect(singleRule).toBeDefined();
    expect(singleRule!.verdict).toBe('PASS');
    expect(singleRule!.explanation).toContain('No outcome');
  });

  it('single outcome FAILED yields FAIL for NO_CRITICAL_FAILURE (critical severity)', () => {
    const outcomes = [
      createActionOutcome({ ...base, id: 'o1', status: 'FAILED' }),
    ];
    const result = evaluateSafetyRules(SAFETY_RULE_CATALOG, outcomes);
    const singleRule = result.evaluations.find((e) => e.ruleId === 'NO_CRITICAL_FAILURE');
    expect(singleRule).toBeDefined();
    expect(singleRule!.verdict).toBe('FAIL');
    expect(singleRule!.severity).toBe('CRITICAL');
    expect(singleRule!.explanation).toContain('Found');
    expect(singleRule!.explanation).toContain('FAILED');
  });

  it('explanation is coherent for PASS and FAIL', () => {
    const passOutcomes = [createActionOutcome({ ...base, id: 'o1', status: 'SUCCESS' })];
    const failOutcomes = [createActionOutcome({ ...base, id: 'o1', status: 'FAILED' })];
    const passResult = evaluateSafetyRules(SAFETY_RULE_CATALOG, passOutcomes);
    const failResult = evaluateSafetyRules(SAFETY_RULE_CATALOG, failOutcomes);
    const passEval = passResult.evaluations.find((e) => e.ruleId === 'NO_CRITICAL_FAILURE');
    const failEval = failResult.evaluations.find((e) => e.ruleId === 'NO_CRITICAL_FAILURE');
    expect(passEval!.explanation.length).toBeGreaterThan(0);
    expect(failEval!.explanation.length).toBeGreaterThan(0);
    expect(passEval!.verdict).toBe('PASS');
    expect(failEval!.verdict).toBe('FAIL');
  });

  it('hasCriticalFailure is true when NO_CRITICAL_FAILURE fails', () => {
    const outcomes = [createActionOutcome({ ...base, id: 'o1', status: 'FAILED' })];
    const result = evaluateSafetyRules(SAFETY_RULE_CATALOG, outcomes);
    expect(result.hasCriticalFailure).toBe(true);
  });

  it('hasCriticalFailure is false when all pass', () => {
    const outcomes = [createActionOutcome({ ...base, id: 'o1', status: 'SUCCESS' })];
    const result = evaluateSafetyRules(SAFETY_RULE_CATALOG, outcomes);
    expect(result.hasCriticalFailure).toBe(false);
  });
});
