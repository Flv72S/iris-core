/**
 * Phase 10.1 — Decision trace replay tests
 */

import { describe, it, expect } from 'vitest';
import { buildDecisionTrace } from '../trace/decision-trace.builder';
import { createDecisionTraceSnapshot, snapshotFromTrace } from '../trace/decision-trace.snapshot';
import { computeDecisionTraceHash } from '../trace/decision-trace.hash';

const input = {
  traceId: 't-replay',
  timestamp: '2025-01-01T12:00:00.000Z',
  resolvedState: { summary: 'S' },
  executionPlan: { x: 1 },
  executionResult: { success: true },
  outcomeLogSnapshot: { finalHash: 'abc', entries: [] },
  activeMode: 'FOCUS' as const,
};

describe('Decision trace replay', () => {
  it('snapshot preserves trace', () => {
    const trace = buildDecisionTrace(input);
    const snapshot = createDecisionTraceSnapshot(trace);
    expect(snapshot.traceHash).toBe(trace.traceHash);
    expect(snapshot.traceId).toBe(trace.traceId);
  });

  it('reconstructed trace has identical hash', () => {
    const trace = buildDecisionTrace(input);
    const reconstructed = buildDecisionTrace({
      ...input,
      traceId: trace.traceId,
      timestamp: trace.timestamp,
    });
    expect(reconstructed.traceHash).toBe(trace.traceHash);
  });

  it('snapshotFromTrace yields byte-equivalent structure', () => {
    const trace = buildDecisionTrace(input);
    const snap = snapshotFromTrace(trace);
    expect(snap.traceHash).toBe(trace.traceHash);
    expect(computeDecisionTraceHash({
      traceId: trace.traceId,
      timestamp: trace.timestamp,
      mode: trace.mode,
      resolutionSummary: trace.resolutionSummary,
      executionSummary: trace.executionSummary,
      outcomeSummary: trace.outcomeSummary,
      steps: trace.steps,
    })).toBe(trace.traceHash);
  });
});
