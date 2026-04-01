/**
 * Phase 10.2 — Explanation trace alignment: sourceSteps refer to real steps, no ghost refs
 */

import { describe, it, expect } from 'vitest';
import { buildDecisionTrace } from '../trace/decision-trace.builder';
import { buildExplanation } from '../explanation/explanation.engine';

const input = {
  traceId: 'align-1',
  timestamp: '2025-01-01T12:00:00.000Z',
  resolvedState: { summary: 'RESOLVED_ALLOWED' },
  executionPlan: {},
  executionResult: { success: true },
  outcomeLogSnapshot: { finalHash: 'h', entries: [] },
  activeMode: 'DEFAULT' as const,
};

describe('Explanation trace alignment', () => {
  it('every section sourceSteps refer to existing step indices', () => {
    const trace = buildDecisionTrace(input);
    const explanation = buildExplanation(trace);
    const maxIndex = trace.steps.length - 1;
    for (const section of explanation.sections) {
      for (const idx of section.sourceSteps) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThanOrEqual(maxIndex);
      }
    }
  });

  it('no ghost references (all sourceSteps are valid indices)', () => {
    const trace = buildDecisionTrace(input);
    const explanation = buildExplanation(trace);
    const validIndices = new Set(trace.steps.map((_, i) => i));
    for (const section of explanation.sections) {
      for (const idx of section.sourceSteps) {
        expect(validIndices.has(idx)).toBe(true);
      }
    }
  });

  it('WHAT section references RESOLUTION or EXECUTION steps', () => {
    const trace = buildDecisionTrace(input);
    const explanation = buildExplanation(trace);
    const what = explanation.sections.find((s) => s.sectionType === 'WHAT');
    expect(what).toBeDefined();
    for (const idx of what!.sourceSteps) {
      const phase = trace.steps[idx].phase;
      expect(['RESOLUTION', 'EXECUTION']).toContain(phase);
    }
  });

  it('MODE section references MODE step', () => {
    const trace = buildDecisionTrace(input);
    const explanation = buildExplanation(trace);
    const modeSection = explanation.sections.find((s) => s.sectionType === 'MODE');
    expect(modeSection).toBeDefined();
    for (const idx of modeSection!.sourceSteps) {
      expect(trace.steps[idx].phase).toBe('MODE');
    }
  });

  it('OUTCOME and SAFETY sections reference OUTCOME steps', () => {
    const trace = buildDecisionTrace(input);
    const explanation = buildExplanation(trace);
    for (const section of explanation.sections) {
      if (section.sectionType === 'OUTCOME' || section.sectionType === 'SAFETY') {
        for (const idx of section.sourceSteps) {
          expect(trace.steps[idx].phase).toBe('OUTCOME');
        }
      }
    }
  });
});
