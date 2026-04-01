/**
 * Phase 7 Final Verification — Tests (run verification and assert READY FOR FREEZE).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  runPhase7Verification,
  formatPhase7Report,
  verifyDeterminism,
  verifyPipelineIntegrity,
  verifyHardCaps,
  verifyHysteresisStability,
  verifySimulationEngine,
  verifyObservatoryLayer,
  VERIFICATION_SCENARIOS,
} from '../index.js';

describe('Phase 7 Verification', () => {
  it('runPhase7Verification returns report with all booleans', () => {
    const report = runPhase7Verification();
    assert.strictEqual(typeof report.deterministic, 'boolean');
    assert.strictEqual(typeof report.pipelineIntegrity, 'boolean');
    assert.strictEqual(typeof report.hardCapsWorking, 'boolean');
    assert.strictEqual(typeof report.antiGamingWorking, 'boolean');
    assert.strictEqual(typeof report.hysteresisStable, 'boolean');
    assert.strictEqual(typeof report.simulationEngineStable, 'boolean');
    assert.strictEqual(typeof report.observatoryIntegrity, 'boolean');
    assert.strictEqual(typeof report.phase7ReadyForFreeze, 'boolean');
    assert.ok(Number.isFinite(report.checkedAt));
  });

  it('phase7ReadyForFreeze is true only when all checks pass', () => {
    const report = runPhase7Verification();
    const allPass =
      report.deterministic &&
      report.pipelineIntegrity &&
      report.hardCapsWorking &&
      report.antiGamingWorking &&
      report.hysteresisStable &&
      report.simulationEngineStable &&
      report.observatoryIntegrity;
    assert.strictEqual(report.phase7ReadyForFreeze, allPass);
  });

  it('formatPhase7Report includes PASS/FAIL and status line', () => {
    const report = runPhase7Verification();
    const formatted = formatPhase7Report(report);
    assert.ok(formatted.includes('Determinism:'));
    assert.ok(formatted.includes('Pipeline Integrity:'));
    assert.ok(formatted.includes('PHASE 7 STATUS:'));
    assert.ok(formatted.includes('PASS') || formatted.includes('FAIL'));
  });

  it('determinism holds for all scenarios', () => {
    for (const scenario of VERIFICATION_SCENARIOS) {
      assert.strictEqual(verifyDeterminism(scenario), true, `Determinism failed: ${scenario.name}`);
    }
  });

  it('pipeline integrity holds for all scenarios', () => {
    for (const scenario of VERIFICATION_SCENARIOS) {
      assert.strictEqual(verifyPipelineIntegrity(scenario), true, `Pipeline failed: ${scenario.name}`);
    }
  });

  it('hard caps and hysteresis and simulation and observatory pass', () => {
    assert.strictEqual(verifyHardCaps(), true);
    assert.strictEqual(verifyHysteresisStability(), true);
    assert.strictEqual(verifySimulationEngine(), true);
    assert.strictEqual(verifyObservatoryLayer(), true);
  });
});
