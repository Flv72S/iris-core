/**
 * Step 7B — Verification of signature and full certification.
 */

import { verify as cryptoVerify, createPublicKey } from 'node:crypto';
import type { GovernanceCertification } from './certification.js';
import { computeCertificationHash } from './hashing.js';
import { canonicalizePayload } from './canonicalization.js';

/**
 * Verify Ed25519 signature of hash. Deterministic.
 */
export function verifyCertificationSignature(
  hash: string,
  signature: Uint8Array,
  publicKey: Uint8Array
): boolean {
  try {
    const keyObj = createPublicKey({
      key: Buffer.from(publicKey),
      format: 'der',
      type: 'spki',
    });
    const data = Buffer.from(hash, 'hex');
    return cryptoVerify(null, data, keyObj, Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Reconstruct payload from certification fields, canonicalize, recompute hash, verify signature.
 */
export function verifyGovernanceCertification(
  certification: GovernanceCertification
): boolean {
  const payload: import('./certificationPayload.js').CertificationPayload = {
    modelVersion: certification.modelVersion,
    tier: certification.tier,
    score: certification.score,
    computedAt: certification.computedAt,
    normalizedMetrics: { ...certification.normalizedMetrics },
  };
  const canonical = canonicalizePayload(payload);
  const recomputedHash = computeCertificationHash(canonical);
  if (recomputedHash !== certification.payloadHash) return false;
  return verifyCertificationSignature(
    certification.payloadHash,
    certification.signature,
    certification.publicKey
  );
}
