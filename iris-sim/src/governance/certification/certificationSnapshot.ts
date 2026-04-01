/**
 * Step 7B — Certification snapshot and chain link (structural support).
 */

import type { GovernanceTierSnapshot } from '../tiering/snapshot.js';
import type { GovernanceCertification } from './certification.js';
import type { CertificationPayload } from './certificationPayload.js';
import { generateGovernanceCertification } from './certification.js';
import { snapshotToPayload } from './certificationPayload.js';
import { canonicalizePayload } from './canonicalization.js';

export interface CertificationChainLink {
  readonly previousCertificationHash: string | null;
  readonly currentCertificationHash: string;
  readonly createdAt: number;
}

export interface GovernanceCertificationSnapshot {
  readonly certification: GovernanceCertification;
  readonly payload: CertificationPayload;
  readonly canonicalPayload: string;
}

export function generateCertificationSnapshot(
  snapshot: GovernanceTierSnapshot,
  privateKey: Uint8Array,
  publicKey: Uint8Array
): GovernanceCertificationSnapshot {
  const certification = generateGovernanceCertification(snapshot, privateKey, publicKey);
  const payload = snapshotToPayload(snapshot);
  const canonicalPayload = canonicalizePayload(payload);
  return Object.freeze({
    certification,
    payload,
    canonicalPayload,
  });
}
