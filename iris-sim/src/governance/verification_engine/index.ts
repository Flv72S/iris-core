/**
 * Microstep 9M — Governance Verification Engine.
 */

export type { GovernanceVerificationResult, VerificationStatus } from './types/governance_verification_types.js';
export { runGovernanceVerification } from './engine/governance_verification_engine.js';
export {
  runIRISCertificateVerification,
  exportVerificationResultToJSON,
} from './verify/governance_verifier.js';
