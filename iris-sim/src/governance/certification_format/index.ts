/**
 * Microstep 9L — Governance Certification Format.
 */

export type {
  IRISGovernanceCertificate,
  IRISGovernanceCertificateInput,
  AuditMetadata,
  CertificateVersioningInfo,
} from './types/certificate_types.js';
export { buildIRISGovernanceCertificate } from './engine/certificate_builder.js';
export {
  computeAuditMetadataHash,
  computeVersioningHash,
  computeCertificateHash,
} from './hashing/certificate_hash.js';
export {
  getCertificateSignaturePayload,
  attachCertificateSignature,
  exportCertificateToJSON,
} from './export/certificate_exporter.js';
export { verifyIRISGovernanceCertificate } from './verify/certificate_verifier.js';
