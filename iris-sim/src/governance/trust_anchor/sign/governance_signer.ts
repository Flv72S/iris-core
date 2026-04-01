/**
 * Step 8J — Governance Signer. Signs objects with IRIS root key.
 */

import { createHash } from 'node:crypto';
import { IRIS_ROOT_KEY_ID, IRIS_ROOT_SECRET } from '../key/iris_root_key.js';
import type { GovernanceSignature } from '../types/trust_anchor_types.js';

const ALGORITHM = 'IRIS_SHA256_ROOT';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Sign a governance object deterministically. object_hash = SHA256(JSON.stringify(object)); signature = SHA256(object_hash + secret).
 */
export function signGovernanceObject(object: unknown): GovernanceSignature {
  const objectHash = sha256Hex(JSON.stringify(object));
  const signature = sha256Hex(objectHash + IRIS_ROOT_SECRET);
  const timestamp = Date.now();
  return Object.freeze({
    signature,
    algorithm: ALGORITHM,
    key_id: IRIS_ROOT_KEY_ID,
    timestamp,
  });
}
