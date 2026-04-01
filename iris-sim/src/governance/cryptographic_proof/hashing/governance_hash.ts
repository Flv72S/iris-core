/**
 * Step 8E — Deterministic SHA-256 hashing for governance objects.
 */

import { createHash } from 'node:crypto';

/**
 * Deterministic hash of a JSON-serializable object. SHA-256 hex.
 */
export function hashObjectDeterministic(obj: unknown): string {
  const json = JSON.stringify(obj);
  return createHash('sha256').update(json, 'utf8').digest('hex');
}
