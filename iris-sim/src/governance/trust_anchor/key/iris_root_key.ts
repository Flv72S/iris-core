/**
 * Step 8J — IRIS Root Governance Key. Simulated root key (fingerprint only).
 */

import { createHash } from 'node:crypto';

export const IRIS_ROOT_KEY_ID = 'IRIS_ROOT_GOVERNANCE_KEY';
export const IRIS_ROOT_SECRET = 'IRIS_ROOT_GOVERNANCE_SECRET';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/** Public fingerprint of the root key (SHA256 of secret). */
export const IRIS_ROOT_PUBLIC_KEY_HASH = sha256Hex(IRIS_ROOT_SECRET);
