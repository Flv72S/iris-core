/**
 * Phase 8 Certification — Determinism tests
 */

import { describe, it, expect } from 'vitest';
import { createCertificationOutcomes, createAllSuccessOutcomes } from '../fixtures/outcomes.fixtures';
import { getCertificationRules } from '../fixtures/safety-rules.fixtures';
import { executePhase8Pipeline } from '../harness/phase8-execution-harness';
import { runPhase8DeterminismCheck } from '../harness/phase8-determinism-checker';

const boundaryReport = {
  signalLayerIsolation: true,
  preferenceImmutability: true,
  learningInactive: true,
  phase7FullyCertified: true,
};

describe('Phase 8 determinism', () => {
  it('N runs produce identical output', () => {
    const outcomes = createAllSuccessOutcomes();
    const rules = getCertificationRules();
    const report = runPhase8DeterminismCheck(5, outcomes, rules, boundaryReport);
    expect(report.runs).toBe(5);
    expect(report.identical).toBe(true);
  });

  it('deep equality across runs', () => {
    const outcomes = createCertificationOutcomes();
    const rules = getCertificationRules();
    const a = executePhase8Pipeline(outcomes, rules, boundaryReport);
    const b = executePhase8Pipeline(outcomes, rules, boundaryReport);
    expect(a.outcomeSnapshot.finalHash).toBe(b.outcomeSnapshot.finalHash);
    expect(a.checklistVerdict.status).toBe(b.checklistVerdict.status);
    expect(a.escalationEvent.level).toBe(b.escalationEvent.level);
    expect(a.attestationSnapshot.snapshotHash).toBe(b.attestationSnapshot.snapshotHash);
  });

  it('inputs are not mutated', () => {
    const outcomes = createCertificationOutcomes();
    const rules = getCertificationRules();
    const beforeOut = JSON.stringify(outcomes.map((o) => o.id));
    const beforeRules = JSON.stringify(rules.map((r) => r.id));
    executePhase8Pipeline(outcomes, rules, boundaryReport);
    runPhase8DeterminismCheck(2, outcomes, rules, boundaryReport);
    expect(JSON.stringify(outcomes.map((o) => o.id))).toBe(beforeOut);
    expect(JSON.stringify(rules.map((r) => r.id))).toBe(beforeRules);
  });
});
