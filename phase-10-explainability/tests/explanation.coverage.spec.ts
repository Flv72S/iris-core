/**
 * Phase 10.2 — Explanation coverage: all section types, resolution types, modes
 */

import { describe, it, expect } from 'vitest';
import { buildDecisionTrace } from '../trace/decision-trace.builder';
import { buildExplanation } from '../explanation/explanation.engine';
import type { ExplanationSectionType } from '../explanation/explanation.types';

const SECTION_TYPES: ExplanationSectionType[] = [
  'WHAT',
  'WHY',
  'WHY_NOT',
  'MODE',
  'SAFETY',
  'OUTCOME',
];

function makeTrace(overrides: {
  resolutionSummary?: string;
  executionSuccess?: boolean;
  mode?: 'DEFAULT' | 'FOCUS' | 'WELLBEING';
}) {
  return buildDecisionTrace({
    traceId: 'cov-1',
    timestamp: '2025-01-01T12:00:00.000Z',
    resolvedState: { summary: overrides.resolutionSummary ?? 'RESOLVED_ALLOWED' },
    executionPlan: {},
    executionResult: { success: overrides.executionSuccess ?? true },
    outcomeLogSnapshot: { finalHash: 'h', entries: [] },
    activeMode: overrides.mode ?? 'DEFAULT',
  });
}

describe('Explanation coverage', () => {
  it('all section types present', () => {
    const trace = makeTrace({});
    const explanation = buildExplanation(trace);
    const types = explanation.sections.map((s) => s.sectionType);
    for (const st of SECTION_TYPES) {
      expect(types).toContain(st);
    }
    expect(explanation.sections.length).toBe(SECTION_TYPES.length);
  });

  it('resolution ALLOWED path covered', () => {
    const trace = makeTrace({ resolutionSummary: 'RESOLVED_ALLOWED' });
    const explanation = buildExplanation(trace);
    const what = explanation.sections.find((s) => s.sectionType === 'WHAT');
    expect(what?.content).toContain('allowed');
  });

  it('resolution BLOCKED path covered', () => {
    const trace = makeTrace({ resolutionSummary: 'RESOLVED_BLOCKED' });
    const explanation = buildExplanation(trace);
    const what = explanation.sections.find((s) => s.sectionType === 'WHAT');
    expect(what?.content).toContain('not executed');
  });

  it('execution failed path covered', () => {
    const trace = makeTrace({ executionSuccess: false });
    const explanation = buildExplanation(trace);
    const what = explanation.sections.find((s) => s.sectionType === 'WHAT');
    expect(what?.content).toContain('failure');
  });

  it('mode DEFAULT covered', () => {
    const trace = makeTrace({ mode: 'DEFAULT' });
    const explanation = buildExplanation(trace);
    const mode = explanation.sections.find((s) => s.sectionType === 'MODE');
    expect(mode?.content).toContain('DEFAULT');
  });

  it('mode FOCUS covered', () => {
    const trace = makeTrace({ mode: 'FOCUS' });
    const explanation = buildExplanation(trace);
    const mode = explanation.sections.find((s) => s.sectionType === 'MODE');
    expect(mode?.content).toContain('FOCUS');
  });

  it('mode WELLBEING covered', () => {
    const trace = makeTrace({ mode: 'WELLBEING' });
    const explanation = buildExplanation(trace);
    const mode = explanation.sections.find((s) => s.sectionType === 'MODE');
    expect(mode?.content).toContain('WELLBEING');
  });
});
