/**
 * Phase 7 Final Verification — Global integrity check (read-only).
 */

export type { VerificationScenario } from './verificationScenarios.js';
export {
  VERIFICATION_SCENARIOS,
  SCENARIO_PERFECT_GOVERNANCE,
  SCENARIO_MINOR_INSTABILITY,
  SCENARIO_INVARIANT_VIOLATION,
  SCENARIO_HIGH_ENTROPY,
  SCENARIO_ANTI_GAMING,
} from './verificationScenarios.js';
export {
  verifyDeterminism,
  verifyPipelineIntegrity,
  verifyHardCaps,
  verifyAntiGamingActivation,
  verifyHysteresisStability,
  verifySimulationEngine,
  verifyObservatoryLayer,
} from './integrityChecks.js';
export type { Phase7VerificationReport } from './verificationReport.js';
export { runPhase7Verification, formatPhase7Report } from './verificationReport.js';
export { runVerification, runVerificationAndFormat } from './phase7Verification.js';
