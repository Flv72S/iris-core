/**
 * Phase 10.X.1 — Test invarianti explainability
 */

import { describe, it, expect } from 'vitest';
import { buildDecisionTrace } from '../trace/decision-trace.builder';
import { buildExplanation } from '../explanation/explanation.engine';
import { computeExplanationHash } from '../explanation/explanation.hash';
import {
  checkExplainabilityInvariants,
  assertAllInvariants,
  EXPLANABILITY_INVARIANT,
} from '../invariants/explainability.invariants';
import type { Explanation } from '../explanation/explanation.types';

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  if (Array.isArray(obj)) obj.forEach(deepFreeze);
  else (Object.values(obj) as unknown[]).forEach(deepFreeze);
  return obj;
}

const traceInput = {
  traceId: 'inv-trace-1',
  timestamp: '2025-01-01T12:00:00.000Z',
  resolvedState: { summary: 'RESOLVED_ALLOWED' },
  executionPlan: {},
  executionResult: { success: true },
  outcomeLogSnapshot: { finalHash: 'h1', entries: [] },
  activeMode: 'DEFAULT' as const,
};

describe('Explainability invariants', () => {
  it('HAS_ALL_SECTIONS pass con explanation completa', () => {
    const trace = buildDecisionTrace(traceInput);
    const explanation = buildExplanation(trace);
    const results = checkExplainabilityInvariants(explanation);
    const r = results.find((x) => x.invariantName === EXPLANABILITY_INVARIANT.HAS_ALL_SECTIONS);
    expect(r?.passed).toBe(true);
  });

  it('HAS_ALL_SECTIONS fail con sezioni mancanti', () => {
    const explanation = deepFreeze({
      explanationId: 'ex',
      traceId: 't',
      summary: 's',
      explanationHash: 'h',
      sections: [
        { sectionType: 'WHAT' as const, content: 'x', sourceSteps: [0] },
        { sectionType: 'WHY' as const, content: 'x', sourceSteps: [0] },
      ],
    }) as unknown as Explanation;
    const results = checkExplainabilityInvariants(explanation);
    const r = results.find((x) => x.invariantName === EXPLANABILITY_INVARIANT.HAS_ALL_SECTIONS);
    expect(r?.passed).toBe(false);
    expect(r?.reason).toContain('mancanti');
  });

  it('NON_EMPTY_SECTIONS fail con contenuto vuoto', () => {
    const trace = buildDecisionTrace(traceInput);
    const explanation = buildExplanation(trace);
    const broken = deepFreeze({
      ...explanation,
      sections: explanation.sections.map((s, i) => (i === 0 ? { ...s, content: '' } : s)),
    }) as unknown as Explanation;
    const results = checkExplainabilityInvariants(broken);
    const r = results.find((x) => x.invariantName === EXPLANABILITY_INVARIANT.NON_EMPTY_SECTIONS);
    expect(r?.passed).toBe(false);
  });

  it('SOURCE_STEPS_PRESENT fail con sourceSteps vuoti', () => {
    const trace = buildDecisionTrace(traceInput);
    const explanation = buildExplanation(trace);
    const broken = deepFreeze({
      ...explanation,
      sections: explanation.sections.map((s, i) => (i === 0 ? { ...s, sourceSteps: [] } : s)),
    }) as unknown as Explanation;
    const results = checkExplainabilityInvariants(broken);
    const r = results.find((x) => x.invariantName === EXPLANABILITY_INVARIANT.SOURCE_STEPS_PRESENT);
    expect(r?.passed).toBe(false);
  });

  it('SECTION_ORDER fail con ordine sbagliato', () => {
    const trace = buildDecisionTrace(traceInput);
    const explanation = buildExplanation(trace);
    const reversed = deepFreeze({
      ...explanation,
      sections: [...explanation.sections].reverse(),
    }) as unknown as Explanation;
    const results = checkExplainabilityInvariants(reversed);
    const r = results.find((x) => x.invariantName === EXPLANABILITY_INVARIANT.SECTION_ORDER);
    expect(r?.passed).toBe(false);
  });

  it('EXPLANATION_HASH_VALID fail con hash errato', () => {
    const trace = buildDecisionTrace(traceInput);
    const explanation = buildExplanation(trace);
    const broken = deepFreeze({
      ...explanation,
      explanationHash: 'hash-sbagliato',
    }) as unknown as Explanation;
    const results = checkExplainabilityInvariants(broken);
    const r = results.find((x) => x.invariantName === EXPLANABILITY_INVARIANT.EXPLANATION_HASH_VALID);
    expect(r?.passed).toBe(false);
  });

  it('IMMUTABILITY fail se explanation non frozen', () => {
    const trace = buildDecisionTrace(traceInput);
    const explanation = buildExplanation(trace);
    const mutable = { ...explanation, sections: [...explanation.sections] };
    const results = checkExplainabilityInvariants(mutable as Explanation);
    const r = results.find((x) => x.invariantName === EXPLANABILITY_INVARIANT.IMMUTABILITY);
    expect(r?.passed).toBe(false);
  });

  it('FIXED_TEMPLATES_ONLY fail con testo non da template', () => {
    const trace = buildDecisionTrace(traceInput);
    const explanation = buildExplanation(trace);
    const broken = deepFreeze({
      ...explanation,
      sections: explanation.sections.map((s, i) =>
        i === 0 ? { ...s, content: 'Testo inventato.' } : s
      ),
    }) as unknown as Explanation;
    const results = checkExplainabilityInvariants(broken);
    const r = results.find((x) => x.invariantName === EXPLANABILITY_INVARIANT.FIXED_TEMPLATES_ONLY);
    expect(r?.passed).toBe(false);
  });

  it('stessa Explanation: tutti invariants passano e hash stabile', () => {
    const trace = buildDecisionTrace(traceInput);
    const explanation = buildExplanation(trace);
    const results = checkExplainabilityInvariants(explanation);
    expect(results.every((r) => r.passed)).toBe(true);
    const hash = computeExplanationHash({
      explanationId: explanation.explanationId,
      traceId: explanation.traceId,
      summary: explanation.summary,
      sections: explanation.sections,
    });
    expect(hash).toBe(explanation.explanationHash);
  });

  it('assertAllInvariants non lancia con explanation valida', () => {
    const trace = buildDecisionTrace(traceInput);
    const explanation = buildExplanation(trace);
    expect(() => assertAllInvariants(explanation)).not.toThrow();
  });

  it('assertAllInvariants lancia con reason esplicito', () => {
    const invalid = deepFreeze({
      explanationId: 'ex',
      traceId: 't',
      summary: 's',
      explanationHash: 'h',
      sections: [{ sectionType: 'WHAT' as const, content: 'x', sourceSteps: [0] }],
    }) as unknown as Explanation;
    expect(() => assertAllInvariants(invalid)).toThrow(/Explainability invariants FAIL/);
  });

  it('risultati check sono frozen', () => {
    const trace = buildDecisionTrace(traceInput);
    const explanation = buildExplanation(trace);
    const results = checkExplainabilityInvariants(explanation);
    expect(Object.isFrozen(results)).toBe(true);
  });
});
