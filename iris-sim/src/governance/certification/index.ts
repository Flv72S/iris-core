/**
 * Step 7B — Certification & Attestation Layer.
 */

export type { CertificationVersion, CertificationConfig } from './certificationConfig.js';
export { CERTIFICATION_CONFIG_V1 } from './certificationConfig.js';
export type { CertificationPayload } from './certificationPayload.js';
export { snapshotToPayload } from './certificationPayload.js';
export { canonicalizePayload } from './canonicalization.js';
export { computeCertificationHash } from './hashing.js';
export { signCertificationHash } from './signing.js';
export { verifyCertificationSignature, verifyGovernanceCertification } from './verification.js';
export type { GovernanceCertification } from './certification.js';
export { generateGovernanceCertification } from './certification.js';
export type { CertificationChainLink, GovernanceCertificationSnapshot } from './certificationSnapshot.js';
export { generateCertificationSnapshot } from './certificationSnapshot.js';
