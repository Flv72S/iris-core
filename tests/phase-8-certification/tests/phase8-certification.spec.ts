import { describe, it, expect } from 'vitest';
import { createCertificationOutcomes, createAllSuccessOutcomes } from '../fixtures/outcomes.fixtures';
import { getCertificationRules } from '../fixtures/safety-rules.fixtures';
import { executePhase8Pipeline } from '../harness/phase8-execution-harness';
import { replayPhase8 } from '../harness/phase8-replay-engine';
import { runPhase8DeterminismCheck } from '../harness/phase8-determinism-checker';
import { producePhase8CertificationReport } from '../reports/phase8-certification-report';

const boundaryReport = {
  signalLayerIsolation: true,
  preferenceImmutability: true,
  learningInactive: true,
  phase7FullyCertified: true,
};

describe('Phase 8 certification', () => {
  it('full pipeline runs without throw', () => {
    const outcomes = createCertificationOutcomes();
    const rules = getCertificationRules();
    expect(() => executePhase8Pipeline(outcomes, rules, boundaryReport)).not.toThrow();
  });

  it('escalation coherent with verdict', () => {
    const outcomes = createCertificationOutcomes();
    const rules = getCertificationRules();
    const result = executePhase8Pipeline(outcomes, rules, boundaryReport);
    expect(result.escalationEvent.checklistStatus).toBe(result.checklistVerdict.status);
  });

  it('all snapshots present', () => {
    const outcomes = createAllSuccessOutcomes();
    const rules = getCertificationRules();
    const result = executePhase8Pipeline(outcomes, rules, boundaryReport);
    expect(result.outcomeSnapshot.finalHash).toBeDefined();
    expect(result.attestationSnapshot.snapshotHash).toBeDefined();
  });

  it('certification report fully true', () => {
    const outcomes = createAllSuccessOutcomes();
    const rules = getCertificationRules();
    const exec = executePhase8Pipeline(outcomes, rules, boundaryReport);
    const replay = replayPhase8(exec, outcomes, rules, boundaryReport);
    const determinism = runPhase8DeterminismCheck(3, outcomes, rules, boundaryReport);
    const report = producePhase8CertificationReport(exec, replay, determinism);
    expect(report.phase8FullyCertified).toBe(true);
  });
});
