/**
 * Step 8K — Governance External Verifier. Independent verification for third parties.
 */

export type { VerificationResult, GovernanceVerificationReport } from './types/verifier_types.js';
export { verifyGovernanceCertificateExternal } from './verify/certificate_verifier.js';
export { verifyGovernanceProofExternal } from './verify/proof_verifier.js';
export { verifyLedgerIntegrity } from './verify/ledger_verifier.js';
export { verifySnapshotIntegrity } from './verify/snapshot_verifier.js';
export type { VerifyIRISGovernanceStateParams } from './engine/governance_external_verifier.js';
export { verifyIRISGovernanceState } from './engine/governance_external_verifier.js';
