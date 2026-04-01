/**
 * Phase 10.1 — Decision trace completeness tests
 */

import { describe, it, expect } from 'vitest';
import { buildDecisionTrace } from '../trace/decision-trace.builder';

const PHASES = ['SIGNAL', 'STATE', 'RESOLUTION', 'MODE', 'EXECUTION', 'OUTCOME'] as const;

const input = {
  traceId: 't1',
  timestamp: '2025-01-01T12:00:00.000Z',
  resolvedState: { summary: 'OK' },
  executionPlan: {},
  executionResult: { success: true },
  outcomeLogSnapshot: { finalHash: 'fh', entries: [] },
  activeMode: 'DEFAULT' as const,
};

describe('Decision trace completeness', () => {
  it('all phases present', () => {
    const trace = buildDecisionTrace(input);
    const phases = trace.steps.map((s) => s.phase);
    for (const p of PHASES) {
      expect(phases).toContain(p);
    }
  });

  it('no step missing', () => {
    const trace = buildDecisionTrace(input);
    expect(trace.steps.length).toBe(6);
    trace.steps.forEach((s, i) => expect(s.stepIndex).toBe(i));
  });

  it('order is SIGNAL, STATE, RESOLUTION, MODE, EXECUTION, OUTCOME', () => {
    const trace = buildDecisionTrace(input);
    PHASES.forEach((phase, i) => expect(trace.steps[i].phase).toBe(phase));
  });
});
