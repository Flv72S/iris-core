/**
 * Phase 10.X.3 — Regression Shield: CI-blocking e simulazione regressione
 */

import { describe, it, expect } from 'vitest';
import { runExplainabilityRegressionSuite } from '../regression/regression.runner';
import { buildRegressionReport } from '../regression/regression.report';
import { compareGoldenWithRuntime } from '../regression/regression.comparator';
import { GOLDEN_TRACES } from '../golden/golden.dataset';
import type { GoldenTrace } from '../golden/golden.dataset';

describe('Group A: Nessuna regressione', () => {
  it('suite: failed === 0, tutti hashEqual traceEqual explanationEqual', () => {
    const results = runExplainabilityRegressionSuite();
    const report = buildRegressionReport(results);
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(report.total);
    results.forEach((r) => {
      expect(r.hashEqual).toBe(true);
      expect(r.traceEqual).toBe(true);
      expect(r.explanationEqual).toBe(true);
    });
  });

  it('un solo fallimento rende il test rosso', () => {
    const results = runExplainabilityRegressionSuite();
    const anyFailed = results.some(
      (r) => !r.traceEqual || !r.explanationEqual || !r.hashEqual
    );
    expect(anyFailed).toBe(false);
  });
});

describe('Group B: Simulazione regressione', () => {
  it('alterazione explanationHash: regression rilevata, details descrittivo', () => {
    const golden = GOLDEN_TRACES[0];
    const tampered: GoldenTrace = { ...golden, explanationHash: 'tampered-hash' };
    const result = compareGoldenWithRuntime(tampered);
    expect(result.hashEqual).toBe(false);
    expect(result.diff?.hashChanged).toBe(true);
    expect(result.diff?.details.length).toBeGreaterThan(0);
  });

  it('alterazione explanation summary: explanationEqual false', () => {
    const golden = GOLDEN_TRACES[0];
    const tampered: GoldenTrace = {
      ...golden,
      explanation: { ...golden.explanation, summary: 'Tampered' },
      explanationHash: 'x',
    };
    const result = compareGoldenWithRuntime(tampered);
    expect(result.explanationEqual).toBe(false);
    expect(result.diff?.explanationChanged).toBe(true);
  });

  it('report con fallimenti: failed > 0, failures popolato', () => {
    const golden = GOLDEN_TRACES[0];
    const tampered: GoldenTrace = { ...golden, explanationHash: 'wrong' };
    const result = compareGoldenWithRuntime(tampered);
    const report = buildRegressionReport([result]);
    expect(report.failed).toBe(1);
    expect(report.failures[0].scenarioId).toBe(golden.scenarioId);
  });
});

describe('Group C: Stabilità serializzazione report', () => {
  it('JSON.stringify(report) stabile tra run', () => {
    const report1 = buildRegressionReport(runExplainabilityRegressionSuite());
    const report2 = buildRegressionReport(runExplainabilityRegressionSuite());
    expect(JSON.stringify(report1)).toBe(JSON.stringify(report2));
  });

  it('report immutabile', () => {
    const report = buildRegressionReport(runExplainabilityRegressionSuite());
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.failures)).toBe(true);
  });
});
