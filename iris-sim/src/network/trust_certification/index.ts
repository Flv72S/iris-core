/**
 * Phase 11E — Federated Trust Certification Engine.
 */

export type { FederatedTrustCertificate, TrustCertificateLevel } from './types/trust_certificate_types.js';
export { classifyTrustCertificate } from './evaluation/certificate_classification_engine.js';
export { generateTrustCertificates, computeCertificateHashPayload } from './generation/trust_certificate_generator.js';
export { signTrustCertificate } from './signing/certificate_signer.js';
export { verifyTrustCertificate } from './verification/certificate_verifier.js';
export { runTrustCertificationEngine } from './trust_certification_engine.js';
