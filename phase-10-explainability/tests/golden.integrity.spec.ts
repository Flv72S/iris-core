/**
 * Phase 10.X.2 — Golden Trace Certification: integrità, rigenerazione, snapshot, invarianti
 */

import { describe, it, expect } from 'vitest';
import { GOLDEN_TRACES } from '../golden/golden.dataset';
import { GOLDEN_SCENARIOS } from '../golden/golden.scenarios';
import { serializeGoldenTrace } from '../golden/golden.serializer';
import { buildExplanation } from '../explanation/explanation.engine';
import { checkExplainabilityInvariants } from '../invariants/explainability.invariants';

const REQUIRED_SECTION_TYPES = ['WHAT', 'WHY', 'WHY_NOT', 'MODE', 'SAFETY', 'OUTCOME'];

describe('Group A: Integrità strutturale', () => {
  it('dataset non vuoto', () => {
    expect(GOLDEN_TRACES.length).toBeGreaterThan(0);
  });
  it('scenarioId unici', () => {
    const ids = GOLDEN_TRACES.map((g) => g.scenarioId);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('oggetti congelati', () => {
    for (const golden of GOLDEN_TRACES) {
      expect(Object.isFrozen(golden)).toBe(true);
      expect(Object.isFrozen(golden.trace)).toBe(true);
      expect(Object.isFrozen(golden.explanation)).toBe(true);
    }
  });
  it('trace valide', () => {
    for (const golden of GOLDEN_TRACES) {
      expect(golden.trace.traceId).toBeTruthy();
      expect(golden.trace.steps.length).toBe(6);
    }
  });
  it('explanation valide', () => {
    for (const golden of GOLDEN_TRACES) {
      expect(golden.explanation.sections.length).toBe(6);
      expect(golden.explanation.explanationHash).toBe(golden.explanationHash);
    }
  });
});

describe('Group B: Rigenerazione deterministica', () => {
  it('rigenera trace e explanation: hash identico e uguaglianza', () => {
    for (let i = 0; i < GOLDEN_SCENARIOS.length; i++) {
      const scenario = GOLDEN_SCENARIOS[i];
      const golden = GOLDEN_TRACES[i];
      const traceRegen = scenario.buildTrace();
      const explanationRegen = buildExplanation(traceRegen);
      expect(traceRegen.traceHash).toBe(golden.trace.traceHash);
      expect(explanationRegen.explanationHash).toBe(golden.explanationHash);
      expect(JSON.stringify(explanationRegen)).toBe(JSON.stringify(golden.explanation));
    }
  });
});

describe('Group C: Stabilità snapshot', () => {
  it('serializzazione stabile e senza timestamp', () => {
    for (const golden of GOLDEN_TRACES) {
      const s = serializeGoldenTrace(golden);
      expect(s).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(serializeGoldenTrace(golden)).toBe(s);
    }
  });
});

describe('Group D: Invarianti cross-phase', () => {
  it('presenza e ordine sezioni WHAT, WHY, WHY_NOT, MODE, SAFETY, OUTCOME', () => {
    for (const golden of GOLDEN_TRACES) {
      const types = golden.explanation.sections.map((s) => s.sectionType);
      REQUIRED_SECTION_TYPES.forEach((t) => expect(types).toContain(t));
      expect(types[0]).toBe('WHAT');
      expect(types[5]).toBe('OUTCOME');
    }
  });
  it('sourceSteps entro indice massimo della trace', () => {
    for (const golden of GOLDEN_TRACES) {
      const max = golden.trace.steps.length - 1;
      for (const section of golden.explanation.sections) {
        for (const idx of section.sourceSteps) {
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThanOrEqual(max);
        }
      }
    }
  });
  it('checkExplainabilityInvariants passa per ogni golden', () => {
    for (const golden of GOLDEN_TRACES) {
      const results = checkExplainabilityInvariants(golden.explanation);
      expect(results.every((r) => r.passed)).toBe(true);
    }
  });
});
