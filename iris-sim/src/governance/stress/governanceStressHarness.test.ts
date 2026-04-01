/**
 * Step 6F — Governance stress harness tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { HardeningInvariantEngine } from '../hardening/hardeningInvariantEngine.js';
import { GovernanceStressHarness } from './governanceStressHarness.js';
import { generateStressScenario } from './stressScenarioGenerator.js';
import type { StressScenarioType } from './stressSimulationTypes.js';

describe('GovernanceStressHarness', () => {
  const steps = 80;
  const seed = 12345;

  it('1. STABLE_BASELINE → certificationPassed === true', () => {
    const harness = new GovernanceStressHarness();
    const result = harness.runSimulation({
      scenario: 'STABLE_BASELINE',
      steps,
      seed,
    });
    assert.strictEqual(result.scenario, 'STABLE_BASELINE');
    assert.strictEqual(result.certificationPassed, true, 'STABLE_BASELINE should pass');
    assert.ok(result.certificationScore >= 0.8);
    assert.strictEqual(result.hardeningReport.systemSafe, true);
    assert.strictEqual(result.stabilityReport.stable, true);
  });

  it('2. MODE_OSCILLATION → certificationPassed === false', () => {
    const harness = new GovernanceStressHarness();
    const result = harness.runSimulation({
      scenario: 'MODE_OSCILLATION',
      steps,
      seed,
    });
    assert.strictEqual(result.certificationPassed, false, 'MODE_OSCILLATION should fail');
    const hysteresisViolation = result.hardeningReport.invariantResults.find(
      (r) => r.invariantName === 'HYSTERESIS_PERSISTENCE' && r.violated
    );
    assert.ok(hysteresisViolation, 'HYSTERESIS_PERSISTENCE should be violated');
  });

  it('3. RECOVERY_ACCELERATION → monotonicity violation present', () => {
    const harness = new GovernanceStressHarness(
      new HardeningInvariantEngine({ epsilon: 1e-5 })
    );
    const result = harness.runSimulation({
      scenario: 'RECOVERY_ACCELERATION',
      steps,
      seed,
    });
    const mono = result.hardeningReport.invariantResults.find(
      (r) => r.invariantName === 'MONOTONICITY_UNDER_RECOVERY'
    );
    assert.ok(mono, 'MONOTONICITY_UNDER_RECOVERY result present');
    assert.strictEqual(mono.violated, true, 'monotonicity should be violated');
    assert.ok(mono.severityScore > 0);
  });

  it('4. REGIME_DRIFT → regimeConsistencyScore lower than STABLE_BASELINE', () => {
    const harness = new GovernanceStressHarness();
    const baseline = harness.runSimulation({
      scenario: 'STABLE_BASELINE',
      steps: 50,
      seed,
    });
    const drift = harness.runSimulation({
      scenario: 'REGIME_DRIFT',
      steps: 50,
      seed,
    });
    assert.ok(
      drift.hardeningReport.regimeConsistencyScore < baseline.hardeningReport.regimeConsistencyScore,
      'REGIME_DRIFT should yield lower regimeConsistencyScore than STABLE_BASELINE'
    );
    assert.ok(
      drift.hardeningReport.regimeConsistencyScore < 0.85,
      'regimeConsistencyScore for REGIME_DRIFT should be degraded'
    );
  });

  it('5. ENTROPY_ESCALATION → entropy high', () => {
    const harness = new GovernanceStressHarness();
    const result = harness.runSimulation({
      scenario: 'ENTROPY_ESCALATION',
      steps,
      seed,
    });
    assert.ok(
      result.stabilityReport.entropy > 0.5,
      'entropy should be high for ENTROPY_ESCALATION'
    );
  });

  it('6. Determinism: same seed → identical deterministicHash', () => {
    const harness = new GovernanceStressHarness();
    const r1 = harness.runSimulation({ scenario: 'STABLE_BASELINE', steps: 50, seed: 999 });
    const r2 = harness.runSimulation({ scenario: 'STABLE_BASELINE', steps: 50, seed: 999 });
    assert.strictEqual(r1.deterministicHash, r2.deterministicHash);
    assert.strictEqual(r1.certificationScore, r2.certificationScore);
    assert.strictEqual(r1.certificationPassed, r2.certificationPassed);
  });

  it('7. 500 random mixed scenarios → no NaN, scores in [0,1]', () => {
    const harness = new GovernanceStressHarness();
    const scenarios: StressScenarioType[] = [
      'REGIME_DRIFT',
      'MODE_OSCILLATION',
      'RECOVERY_ACCELERATION',
      'PLATEAU_COLLAPSE',
      'ENTROPY_ESCALATION',
      'STABLE_BASELINE',
    ];
    for (let i = 0; i < 500; i++) {
      const result = harness.runSimulation({
        scenario: scenarios[i % scenarios.length],
        steps: 30 + (i % 70),
        seed: i * 7919,
      });
      assert.ok(!Number.isNaN(result.certificationScore));
      assert.ok(result.certificationScore >= 0 && result.certificationScore <= 1);
      assert.ok(!Number.isNaN(result.hardeningReport.globalHardeningIndex));
      assert.ok(
        result.hardeningReport.globalHardeningIndex >= 0 &&
          result.hardeningReport.globalHardeningIndex <= 1
      );
      assert.ok(typeof result.deterministicHash === 'string' && result.deterministicHash.length > 0);
    }
  });

  it('8. Performance: 1000 steps simulation completes in acceptable time', () => {
    const harness = new GovernanceStressHarness();
    const start = Date.now();
    const result = harness.runSimulation({
      scenario: 'STABLE_BASELINE',
      steps: 1000,
      seed: 42,
    });
    const elapsed = Date.now() - start;
    assert.strictEqual(result.steps, 1000);
    assert.ok(elapsed < 5000, `1000 steps should complete in < 5s, took ${elapsed}ms`);
    assert.strictEqual(result.certificationPassed, true);
  });
});

describe('generateStressScenario', () => {
  it('returns correct length and structure', () => {
    const out = generateStressScenario({
      scenario: 'STABLE_BASELINE',
      steps: 20,
      seed: 0,
    });
    assert.strictEqual(out.dynamicsHistory.length, 20);
    assert.strictEqual(out.governanceSignalHistory.length, 20);
    assert.ok(out.dynamicsHistory[0].timestamp > 0);
    assert.ok(out.dynamicsHistory[0].residualInstabilityScore >= 0);
    assert.ok(
      ['STRONG', 'WEAK', 'FRAGILE'].includes(out.dynamicsHistory[0].plateauStrength)
    );
    assert.ok(out.governanceSignalHistory[0].mode);
  });
});
