/**
 * Step 8C — Adaptation snapshot with integrity hash for auditability.
 */

import { createHash } from 'node:crypto';
import type { AdaptationSnapshot } from '../types/adaptation_types.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export interface AdaptationSnapshotWithHash {
  readonly snapshot: AdaptationSnapshot;
  readonly adaptation_hash: string;
}

/**
 * Add integrity hash to adaptation snapshot. Deterministic, reproducible.
 */
export function withAdaptationHash(snapshot: AdaptationSnapshot): AdaptationSnapshotWithHash {
  const canonical = JSON.stringify(snapshot);
  const adaptation_hash = sha256Hex(canonical);
  return Object.freeze({
    snapshot,
    adaptation_hash,
  });
}
