/**
 * Phase 10.2 — Explanation determinism: same trace → same explanation, stable hash, no mutation
 */

import { describe, it, expect } from 'vitest';
import { buildDecisionTrace } from '../trace/decision-trace.builder';
import { buildExplanation } from '../explanation/explanation.engine';
import { computeExplanationHash } from '../explanation/explanation.hash';

const baseInput = {
  traceId: 'trace-1',
  timestamp: '2025-01-01T12:00:00.000Z',
  resolvedState: { summary: 'RESOLVED_ALLOWED' },
  executionPlan: { planId: 'p1' },
  executionResult: { success: true },
  outcomeLogSnapshot: { finalHash: 'h1', entries: [] },
  activeMode: 'DEFAULT' as const,
};

describe('Explanation determinism', () => {
  it('same trace produces same explanation', () => {
    const trace = buildDecisionTrace(baseInput);
    const a = buildExplanation(trace);
    const b = buildExplanation(trace);
    expect(a.explanationHash).toBe(b.explanationHash);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('hash is stable', () => {
    const trace = buildDecisionTrace(baseInput);
    const explanation = buildExplanation(trace);
    const recomputed = computeExplanationHash({
      explanationId: explanation.explanationId,
      traceId: explanation.traceId,
      summary: explanation.summary,
      sections: explanation.sections,
    });
    expect(recomputed).toBe(explanation.explanationHash);
  });

  it('deep equality for two builds from same trace', () => {
    const trace = buildDecisionTrace(baseInput);
    const a = buildExplanation(trace);
    const b = buildExplanation(trace);
    expect(a).toEqual(b);
  });

  it('trace is not mutated', () => {
    const trace = buildDecisionTrace(baseInput);
    const before = JSON.stringify(trace);
    buildExplanation(trace);
    expect(JSON.stringify(trace)).toBe(before);
  });
});
