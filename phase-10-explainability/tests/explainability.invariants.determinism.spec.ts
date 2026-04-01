/**
 * Phase 10.X.1 — Determinismo invarianti: N esecuzioni, stesso risultato e hash
 */

import { describe, it, expect } from 'vitest';
import { buildDecisionTrace } from '../trace/decision-trace.builder';
import { buildExplanation } from '../explanation/explanation.engine';
import { computeExplanationHash } from '../explanation/explanation.hash';
import { checkExplainabilityInvariants } from '../invariants/explainability.invariants';

const traceInput = {
  traceId: 'det-trace-1',
  timestamp: '2025-01-01T12:00:00.000Z',
  resolvedState: { summary: 'RESOLVED_ALLOWED' },
  executionPlan: {},
  executionResult: { success: true },
  outcomeLogSnapshot: { finalHash: 'h1', entries: [] },
  activeMode: 'DEFAULT' as const,
};

const N = 20;

describe('Explainability invariants determinism', () => {
  it('N esecuzioni: checkExplainabilityInvariants sempre PASS', () => {
    const trace = buildDecisionTrace(traceInput);
    const explanation = buildExplanation(trace);
    for (let i = 0; i < N; i++) {
      const results = checkExplainabilityInvariants(explanation);
      const allPassed = results.every((r) => r.passed);
      expect(allPassed).toBe(true);
    }
  });

  it('N esecuzioni: computeExplanationHash invariato', () => {
    const trace = buildDecisionTrace(traceInput);
    const explanation = buildExplanation(trace);
    const firstHash = computeExplanationHash({
      explanationId: explanation.explanationId,
      traceId: explanation.traceId,
      summary: explanation.summary,
      sections: explanation.sections,
    });
    for (let i = 0; i < N; i++) {
      const h = computeExplanationHash({
        explanationId: explanation.explanationId,
        traceId: explanation.traceId,
        summary: explanation.summary,
        sections: explanation.sections,
      });
      expect(h).toBe(firstHash);
    }
    expect(firstHash).toBe(explanation.explanationHash);
  });
});
