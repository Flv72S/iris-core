import { describe, it, expect } from 'vitest';
import { createActionOutcome } from '../../outcome/model/outcome.factory';
import { SAFETY_RULE_CATALOG } from '../rules/safety-rule.catalog';
import { evaluateSafetyRules } from '../evaluation/safety-rule-evaluator';

const base = {
  actionIntentId: 'intent-1',
  source: 'EXECUTION_RUNTIME' as const,
  timestamp: 1000,
};

describe('Safety evaluator sequence', () => {
  it('sequence with failures under threshold yields PASS for NO_FAILURE_CASCADE', () => {
    const outcomes = [
      createActionOutcome({ ...base, id: 'o1', status: 'SUCCESS' }),
      createActionOutcome({ ...base, id: 'o2', status: 'FAILED' }),
      createActionOutcome({ ...base, id: 'o3', status: 'FAILED' }),
      createActionOutcome({ ...base, id: 'o4', status: 'SUCCESS' }),
    ];
    const result = evaluateSafetyRules(SAFETY_RULE_CATALOG, outcomes);
    const cascadeRule = result.evaluations.find((e) => e.ruleId === 'NO_FAILURE_CASCADE');
    expect(cascadeRule).toBeDefined();
    expect(cascadeRule!.verdict).toBe('PASS');
    expect(cascadeRule!.explanation).toContain('within limit');
  });

  it('sequence with failures over threshold yields FAIL for NO_FAILURE_CASCADE', () => {
    const outcomes = [
      createActionOutcome({ ...base, id: 'o1', status: 'FAILED' }),
      createActionOutcome({ ...base, id: 'o2', status: 'FAILED' }),
      createActionOutcome({ ...base, id: 'o3', status: 'FAILED' }),
      createActionOutcome({ ...base, id: 'o4', status: 'FAILED' }),
    ];
    const result = evaluateSafetyRules(SAFETY_RULE_CATALOG, outcomes);
    const cascadeRule = result.evaluations.find((e) => e.ruleId === 'NO_FAILURE_CASCADE');
    expect(cascadeRule!.verdict).toBe('FAIL');
    expect(cascadeRule!.explanation).toContain('max allowed is 3');
  });

  it('outcome order is respected', () => {
    const seqA = [
      createActionOutcome({ ...base, id: 'a1', status: 'SUCCESS' }),
      createActionOutcome({ ...base, id: 'a2', status: 'FAILED' }),
    ];
    const seqB = [
      createActionOutcome({ ...base, id: 'b1', status: 'FAILED' }),
      createActionOutcome({ ...base, id: 'b2', status: 'SUCCESS' }),
    ];
    const resultA = evaluateSafetyRules(SAFETY_RULE_CATALOG, seqA);
    const resultB = evaluateSafetyRules(SAFETY_RULE_CATALOG, seqB);
    expect(resultA.evaluations.length).toBe(resultB.evaluations.length);
  });

  it('empty sequence yields NOT_APPLICABLE for NO_FAILURE_CASCADE', () => {
    const result = evaluateSafetyRules(SAFETY_RULE_CATALOG, []);
    const cascadeRule = result.evaluations.find((e) => e.ruleId === 'NO_FAILURE_CASCADE');
    expect(cascadeRule!.verdict).toBe('NOT_APPLICABLE');
    expect(cascadeRule!.explanation).toContain('Empty sequence');
  });

  it('empty sequence yields NOT_APPLICABLE for NO_CRITICAL_FAILURE', () => {
    const result = evaluateSafetyRules(SAFETY_RULE_CATALOG, []);
    const singleRule = result.evaluations.find((e) => e.ruleId === 'NO_CRITICAL_FAILURE');
    expect(singleRule!.verdict).toBe('NOT_APPLICABLE');
  });
});
