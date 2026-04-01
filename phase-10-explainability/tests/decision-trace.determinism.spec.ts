import { describe, it, expect } from 'vitest';
import { buildDecisionTrace } from '../trace/decision-trace.builder';
import { computeDecisionTraceHash } from '../trace/decision-trace.hash';

const baseInput = {
  traceId: 'trace-1',
  timestamp: '2025-01-01T12:00:00.000Z',
  resolvedState: { summary: 'RESOLVED_ALLOWED' },
  executionPlan: { planId: 'p1' },
  executionResult: { success: true },
  outcomeLogSnapshot: { finalHash: 'h1', entries: [] },
  activeMode: 'DEFAULT' as const,
};

describe('Decision trace determinism', () => {
  it('same input produces same trace', () => {
    const a = buildDecisionTrace(baseInput);
    const b = buildDecisionTrace(baseInput);
    expect(a.traceHash).toBe(b.traceHash);
  });

  it('hash is stable', () => {
    const trace = buildDecisionTrace(baseInput);
    const h = computeDecisionTraceHash({
      traceId: trace.traceId,
      timestamp: trace.timestamp,
      mode: trace.mode,
      resolutionSummary: trace.resolutionSummary,
      executionSummary: trace.executionSummary,
      outcomeSummary: trace.outcomeSummary,
      steps: trace.steps,
    });
    expect(h).toBe(trace.traceHash);
  });

  it('deep equality', () => {
    const a = buildDecisionTrace(baseInput);
    const b = buildDecisionTrace(baseInput);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('input is not mutated', () => {
    const input = { ...baseInput };
    const before = JSON.stringify(input);
    buildDecisionTrace(input);
    expect(JSON.stringify(input)).toBe(before);
  });
});
