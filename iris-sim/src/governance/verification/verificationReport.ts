/**
 * Phase 7 Final Verification — Report model and runner.
 */

import { VERIFICATION_SCENARIOS, SCENARIO_ANTI_GAMING } from './verificationScenarios.js';
import {
  verifyDeterminism,
  verifyPipelineIntegrity,
  verifyHardCaps,
  verifyAntiGamingActivation,
  verifyHysteresisStability,
  verifySimulationEngine,
  verifyObservatoryLayer,
} from './integrityChecks.js';

export interface Phase7VerificationReport {
  readonly deterministic: boolean;
  readonly pipelineIntegrity: boolean;
  readonly hardCapsWorking: boolean;
  readonly antiGamingWorking: boolean;
  readonly hysteresisStable: boolean;
  readonly simulationEngineStable: boolean;
  readonly observatoryIntegrity: boolean;
  readonly phase7ReadyForFreeze: boolean;
  readonly checkedAt: number;
}

/**
 * Run all Phase 7 integrity checks; produce deterministic report.
 */
export function runPhase7Verification(): Phase7VerificationReport {
  const checkedAt = Date.now();

  let deterministic = true;
  for (const scenario of VERIFICATION_SCENARIOS) {
    if (!verifyDeterminism(scenario)) {
      deterministic = false;
      break;
    }
  }

  let pipelineIntegrity = true;
  for (const scenario of VERIFICATION_SCENARIOS) {
    if (!verifyPipelineIntegrity(scenario)) {
      pipelineIntegrity = false;
      break;
    }
  }

  const hardCapsWorking = verifyHardCaps();
  const antiGamingWorking = verifyAntiGamingActivation(SCENARIO_ANTI_GAMING.snapshot);
  const hysteresisStable = verifyHysteresisStability();
  const simulationEngineStable = verifySimulationEngine();
  const observatoryIntegrity = verifyObservatoryLayer();

  const phase7ReadyForFreeze =
    deterministic &&
    pipelineIntegrity &&
    hardCapsWorking &&
    antiGamingWorking &&
    hysteresisStable &&
    simulationEngineStable &&
    observatoryIntegrity;

  return Object.freeze({
    deterministic,
    pipelineIntegrity,
    hardCapsWorking,
    antiGamingWorking,
    hysteresisStable,
    simulationEngineStable,
    observatoryIntegrity,
    phase7ReadyForFreeze,
    checkedAt,
  });
}

/**
 * Format report as string for console/output.
 */
export function formatPhase7Report(report: Phase7VerificationReport): string {
  const pass = (b: boolean) => (b ? 'PASS' : 'FAIL');
  const lines = [
    'Phase 7 Verification Report',
    '---',
    `Determinism: ${pass(report.deterministic)}`,
    `Pipeline Integrity: ${pass(report.pipelineIntegrity)}`,
    `Hard Caps: ${pass(report.hardCapsWorking)}`,
    `Anti-Gaming: ${pass(report.antiGamingWorking)}`,
    `Hysteresis Stability: ${pass(report.hysteresisStable)}`,
    `Simulation Engine: ${pass(report.simulationEngineStable)}`,
    `Observatory Integrity: ${pass(report.observatoryIntegrity)}`,
    '---',
    report.phase7ReadyForFreeze
      ? 'PHASE 7 STATUS: READY FOR FREEZE'
      : 'PHASE 7 STATUS: NOT READY',
  ];
  return lines.join('\n');
}
