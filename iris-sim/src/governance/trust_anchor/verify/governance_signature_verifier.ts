/**
 * Step 8J — Governance Signature Verifier. Verifies root-signed objects.
 */

import { createHash } from 'node:crypto';
import { IRIS_ROOT_KEY_ID, IRIS_ROOT_SECRET } from '../key/iris_root_key.js';
import type { GovernanceSignature } from '../types/trust_anchor_types.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Verify signature: recompute object hash and signature; compare with signature; verify key_id.
 */
export function verifyGovernanceSignature(
  object: unknown,
  sig: GovernanceSignature
): boolean {
  if (sig.key_id !== IRIS_ROOT_KEY_ID) return false;
  const objectHash = sha256Hex(JSON.stringify(object));
  const expectedSignature = sha256Hex(objectHash + IRIS_ROOT_SECRET);
  return sig.signature === expectedSignature;
}
