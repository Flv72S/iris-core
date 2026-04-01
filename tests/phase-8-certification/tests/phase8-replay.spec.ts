import { describe, it, expect } from 'vitest';
import { createActionOutcome } from '../../../phase-8-feedback/outcome/model/outcome.factory';
import { createAllSuccessOutcomes, createCertificationOutcomes } from '../fixtures/outcomes.fixtures';
import { getCertificationRules } from '../fixtures/safety-rules.fixtures';
import { executePhase8Pipeline } from '../harness/phase8-execution-harness';
import { replayPhase8 } from '../harness/phase8-replay-engine';

const boundaryReport = {
  signalLayerIsolation: true,
  preferenceImmutability: true,
  learningInactive: true,
  phase7FullyCertified: true,
};

describe('Phase 8 replay', () => {
  it('same input produces identical replay', () => {
    const outcomes = createAllSuccessOutcomes();
    const rules = getCertificationRules();
    const original = executePhase8Pipeline(outcomes, rules, boundaryReport);
    const replay = replayPhase8(original, outcomes, rules, boundaryReport);
    expect(replay.identical).toBe(true);
  });

  it('modified outcome causes replay to differ', () => {
    const outcomes = createAllSuccessOutcomes();
    const rules = getCertificationRules();
    const original = executePhase8Pipeline(outcomes, rules, boundaryReport);
    const modified = [outcomes[0], createActionOutcome({ id: 'x', actionIntentId: 'i', status: 'FAILED', source: 'EXECUTION_RUNTIME', timestamp: 1000 })];
    const replay = replayPhase8(original, modified, rules, boundaryReport);
    expect(replay.identical).toBe(false);
  });

  it('different rules change result when outcome violates a rule', () => {
    const outcomes = createCertificationOutcomes();
    const rules = getCertificationRules();
    const original = executePhase8Pipeline(outcomes, rules, boundaryReport);
    const emptyRules: typeof rules = [];
    const replayEmpty = replayPhase8(original, outcomes, emptyRules, boundaryReport);
    expect(replayEmpty.identical).toBe(false);
  });
});
