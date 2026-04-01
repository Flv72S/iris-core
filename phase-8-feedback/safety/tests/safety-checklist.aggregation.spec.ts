import { describe, it, expect } from 'vitest';
import { aggregateSafetyEvaluations } from '../checklist/safety-checklist.aggregator';
import type { SafetyRuleEvaluation } from '../evaluation/safety-evaluation.types';

function ev(ruleId: string, verdict: SafetyRuleEvaluation['verdict'], severity: string): SafetyRuleEvaluation {
  return Object.freeze({ ruleId, ruleVersion: '1.0.0', verdict, severity, explanation: '' });
}

describe('Safety checklist aggregation', () => {
  it('SAFE when no FAIL', () => {
    const evaluations = [ev('R1', 'PASS', 'CRITICAL'), ev('R2', 'PASS', 'WARNING')];
    const verdict = aggregateSafetyEvaluations(evaluations);
    expect(verdict.status).toBe('SAFE');
    expect(verdict.violatedRules.length).toBe(0);
    expect(verdict.hasCriticalFailure).toBe(false);
  });

  it('WARNING with FAIL WARNING', () => {
    const evaluations = [ev('R1', 'PASS', 'CRITICAL'), ev('R2', 'FAIL', 'WARNING')];
    const verdict = aggregateSafetyEvaluations(evaluations);
    expect(verdict.status).toBe('WARNING');
    expect(verdict.violatedRules).toContain('R2');
    expect(verdict.hasCriticalFailure).toBe(false);
  });

  it('UNSAFE with FAIL CRITICAL', () => {
    const evaluations = [ev('R1', 'PASS', 'CRITICAL'), ev('R2', 'FAIL', 'CRITICAL')];
    const verdict = aggregateSafetyEvaluations(evaluations);
    expect(verdict.status).toBe('UNSAFE');
    expect(verdict.violatedRules).toContain('R2');
    expect(verdict.hasCriticalFailure).toBe(true);
  });

  it('violatedRules ordered', () => {
    const evaluations = [ev('B', 'FAIL', 'WARNING'), ev('A', 'FAIL', 'CRITICAL')];
    const verdict = aggregateSafetyEvaluations(evaluations);
    expect(verdict.violatedRules[0]).toBe('A');
    expect(verdict.violatedRules[1]).toBe('B');
  });

  it('hasCriticalFailure only with FAIL CRITICAL', () => {
    expect(aggregateSafetyEvaluations([ev('R', 'FAIL', 'WARNING')]).hasCriticalFailure).toBe(false);
    expect(aggregateSafetyEvaluations([ev('R', 'FAIL', 'CRITICAL')]).hasCriticalFailure).toBe(true);
  });
});
