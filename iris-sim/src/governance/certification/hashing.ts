/**
 * Step 7B — Cryptographic hash of canonical payload.
 */

import { createHash } from 'node:crypto';

/**
 * SHA-256 hash of canonical payload string. Output hex.
 */
export function computeCertificationHash(canonicalPayload: string): string {
  return createHash('sha256').update(canonicalPayload, 'utf8').digest('hex');
}
