/**
 * Step 7B — Governance certification generation.
 */

import type { CertificationVersion } from './certificationConfig.js';
import type { GovernanceTier } from '../tiering/hysteresis.js';
import type { GovernanceTierSnapshot } from '../tiering/snapshot.js';
import { snapshotToPayload } from './certificationPayload.js';
import { canonicalizePayload } from './canonicalization.js';
import { computeCertificationHash } from './hashing.js';
import { signCertificationHash } from './signing.js';
import { CERTIFICATION_CONFIG_V1 } from './certificationConfig.js';

export interface GovernanceCertification {
  readonly certificationVersion: CertificationVersion;
  readonly modelVersion: string;
  readonly payloadHash: string;
  readonly signature: Uint8Array;
  readonly publicKey: Uint8Array;
  readonly tier: GovernanceTier;
  readonly score: number;
  readonly computedAt: number;
  readonly normalizedMetrics: Record<string, number>;
}

/**
 * Generate certification from tier snapshot: payload → canonical → hash → sign.
 */
export function generateGovernanceCertification(
  snapshot: GovernanceTierSnapshot,
  privateKey: Uint8Array,
  publicKey: Uint8Array
): GovernanceCertification {
  const config = CERTIFICATION_CONFIG_V1;
  const payload = snapshotToPayload(snapshot);
  const canonical = canonicalizePayload(payload);
  const hash = computeCertificationHash(canonical);
  const signature = signCertificationHash(hash, privateKey);

  const metrics: Record<string, number> = {};
  const m = snapshot.normalizedMetrics;
  metrics.entropyControl = m.entropyControl;
  metrics.flipStability = m.flipStability;
  metrics.invariantIntegrity = m.invariantIntegrity;
  metrics.violationPressure = m.violationPressure;

  return Object.freeze({
    certificationVersion: config.version,
    modelVersion: snapshot.modelVersion,
    payloadHash: hash,
    signature,
    publicKey: publicKey.slice(0),
    tier: snapshot.tier,
    score: snapshot.score,
    computedAt: snapshot.computedAt,
    normalizedMetrics: Object.freeze(metrics),
  });
}
