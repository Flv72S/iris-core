/**
 * Step 7B — Certification & Attestation Layer. Config and version.
 */

export type CertificationVersion = '7B_v1.0';

export interface CertificationConfig {
  readonly version: CertificationVersion;
  readonly hashAlgorithm: 'sha256';
  readonly signatureAlgorithm: 'ed25519';
  readonly includeModelVersion: boolean;
  readonly includeTimestamp: boolean;
}

export const CERTIFICATION_CONFIG_V1: CertificationConfig = Object.freeze({
  version: '7B_v1.0',
  hashAlgorithm: 'sha256',
  signatureAlgorithm: 'ed25519',
  includeModelVersion: true,
  includeTimestamp: true,
});
