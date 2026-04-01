/**
 * Phase 8.2.3 — Aggregation and explain determinism tests
 */

import { describe, it, expect } from 'vitest';
import { aggregateSafetyEvaluations } from '../checklist/safety-checklist.aggregator';
import { explainSafetyChecklist } from '../checklist/safety-checklist.explain';
import type { SafetyRuleEvaluation } from '../evaluation/safety-evaluation.types';

function ev(ruleId: string, verdict: SafetyRuleEvaluation['verdict'], severity: string): SafetyRuleEvaluation {
  return Object.freeze({
    ruleId,
    ruleVersion: '1.0.0',
    verdict,
    severity,
    explanation: `${ruleId} ${verdict}`,
  });
}

describe('Safety checklist aggregation determinism', () => {
  it('same input produces same verdict', () => {
    const evaluations = [
      ev('R1', 'PASS', 'CRITICAL'),
      ev('R2', 'FAIL', 'WARNING'),
    ];
    const a = aggregateSafetyEvaluations(evaluations);
    const b = aggregateSafetyEvaluations(evaluations);
    expect(a).toEqual(b);
    expect(a.status).toBe(b.status);
    expect(a.violatedRules).toEqual(b.violatedRules);
  });

  it('explanation identical across runs', () => {
    const evaluations = [
      ev('R1', 'FAIL', 'CRITICAL'),
    ];
    const verdict = aggregateSafetyEvaluations(evaluations);
    const exp1 = explainSafetyChecklist(verdict, evaluations);
    const exp2 = explainSafetyChecklist(verdict, evaluations);
    expect(exp1).toBe(exp2);
  });

  it('input evaluations are not mutated', () => {
    const evaluations = [
      ev('R1', 'PASS', 'CRITICAL'),
    ];
    const before = JSON.stringify(evaluations);
    aggregateSafetyEvaluations(evaluations);
    explainSafetyChecklist(aggregateSafetyEvaluations(evaluations), evaluations);
    expect(JSON.stringify(evaluations)).toBe(before);
  });

  it('output verdict is deep equal and immutable', () => {
    const evaluations = [ev('R1', 'PASS', 'CRITICAL')];
    const verdict = aggregateSafetyEvaluations(evaluations);
    expect(Object.isFrozen(verdict)).toBe(true);
    expect(Object.isFrozen(verdict.violatedRules)).toBe(true);
    const verdict2 = aggregateSafetyEvaluations(evaluations);
    expect(verdict).toEqual(verdict2);
  });
});
