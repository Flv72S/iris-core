/**
 * Microstep 10G — Governance Trust Event Log Engine. Event hashing.
 */

import { createHash } from 'node:crypto';
import type { TrustEventType } from '../types/trust_event_types.js';
import type { TrustEventPayload } from '../types/trust_event_types.js';
import { serializeEventPayload } from '../utils/event_utils.js';

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

/**
 * Hash payload deterministically.
 */
export function hashPayload(payload: TrustEventPayload): string {
  const serialized = serializeEventPayload(payload);
  return sha256(serialized);
}

/**
 * Compute event hash from type, timestamp, and payload_hash (deterministic).
 */
export function computeEventHash(
  type: TrustEventType,
  timestamp: number,
  payload_hash: string
): string {
  const payload = `event:type=${type}|ts=${timestamp}|payload_hash=${payload_hash}`;
  return sha256(payload);
}
