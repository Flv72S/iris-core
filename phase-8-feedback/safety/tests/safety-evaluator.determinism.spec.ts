/**
 * Phase 8.2.2 — Evaluation determinism tests
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

describe('Safety evaluator determinism', () => {
  it('same input produces same output (deep equality)', () => {
    const outcomes = [
      createActionOutcome({ ...base, id: 'o1', status: 'SUCCESS' }),
      createActionOutcome({ ...base, id: 'o2', status: 'FAILED' }),
    ];
    const a = evaluateSafetyRules(SAFETY_RULE_CATALOG, outcomes);
    const b = evaluateSafetyRules(SAFETY_RULE_CATALOG, outcomes);
    expect(a).toEqual(b);
    expect(a.hasCriticalFailure).toBe(b.hasCriticalFailure);
    expect(a.evaluations.length).toBe(b.evaluations.length);
    a.evaluations.forEach((e, i) => {
      expect(e.ruleId).toBe(b.evaluations[i].ruleId);
      expect(e.verdict).toBe(b.evaluations[i].verdict);
      expect(e.explanation).toBe(b.evaluations[i].explanation);
    });
  });

  it('different outcome order can yield different result when relevant', () => {
    const withFailures = [
      createActionOutcome({ ...base, id: '1', status: 'FAILED' }),
      createActionOutcome({ ...base, id: '2', status: 'FAILED' }),
      createActionOutcome({ ...base, id: '3', status: 'FAILED' }),
      createActionOutcome({ ...base, id: '4', status: 'FAILED' }),
    ];
    const allSuccess = withFailures.map((_, i) =>
      createActionOutcome({ ...base, id: `s${i}`, status: 'SUCCESS' })
    );
    const resultFail = evaluateSafetyRules(SAFETY_RULE_CATALOG, withFailures);
    const resultPass = evaluateSafetyRules(SAFETY_RULE_CATALOG, allSuccess);
    expect(resultFail.hasCriticalFailure).toBe(true);
    expect(resultPass.hasCriticalFailure).toBe(false);
    const cascadeFail = resultFail.evaluations.find((e) => e.ruleId === 'NO_FAILURE_CASCADE');
    const cascadePass = resultPass.evaluations.find((e) => e.ruleId === 'NO_FAILURE_CASCADE');
    expect(cascadeFail!.verdict).toBe('FAIL');
    expect(cascadePass!.verdict).toBe('PASS');
  });

  it('input outcomes are not mutated', () => {
    const outcomes = [
      createActionOutcome({ ...base, id: 'o1', status: 'SUCCESS' }),
    ];
    const before = JSON.stringify(outcomes);
    evaluateSafetyRules(SAFETY_RULE_CATALOG, outcomes);
    const after = JSON.stringify(outcomes);
    expect(after).toBe(before);
  });

  it('result is immutable', () => {
    const outcomes = [createActionOutcome({ ...base, id: 'o1', status: 'SUCCESS' })];
    const result = evaluateSafetyRules(SAFETY_RULE_CATALOG, outcomes);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.evaluations)).toBe(true);
    result.evaluations.forEach((e) => expect(Object.isFrozen(e)).toBe(true));
  });

  it('evaluation order matches catalog order', () => {
    const outcomes = [createActionOutcome({ ...base, id: 'o1', status: 'SUCCESS' })];
    const result = evaluateSafetyRules(SAFETY_RULE_CATALOG, outcomes);
    expect(result.evaluations.length).toBe(SAFETY_RULE_CATALOG.length);
    result.evaluations.forEach((e, i) => {
      expect(e.ruleId).toBe(SAFETY_RULE_CATALOG[i].id);
    });
  });
});
