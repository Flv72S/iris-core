/**
 * Phase 11D — Inter-Organizational Trust Layer.
 */

export type {
  NodeTrustIndex,
  TrustLevel,
  CertificateAttestationResult,
  TrustProof,
  TrustSummary,
  FederatedTrustReport,
} from './types/trust_types.js';

export {
  computeTrustIndices,
  computeDeclaredTrust,
  computeObservedTrust,
  computeVerifiedTrust,
} from './evaluation/trust_index_engine.js';
export { verifyCertificateAttestations } from './attestation/certificate_attestation_verifier.js';
export { generateTrustProof } from './proof/trust_proof_generator.js';
export {
  buildFederatedTrustReport,
  calculateReportHash,
  verifyFederatedTrustReport,
} from './report/federated_trust_report_builder.js';
export { runInterOrgTrustEngine, type InterOrgTrustEngineParams } from './inter_org_trust_engine.js';

/** Phase 11D.2 — Trust Certificate Eligibility */
export type {
  CertificateEligibilityStatus,
  CertificateEligibilityReason,
  NodeCertificateEligibility,
} from './eligibility/trust_certificate_eligibility_types.js';
export { evaluateCertificateEligibility } from './eligibility/trust_certificate_eligibility_engine.js';
