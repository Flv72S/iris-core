/**
 * Microstep 10G — Governance Trust Event Log Engine. Event builder.
 */

import type { TrustEventType, TrustEventPayload, TrustEvent } from '../types/trust_event_types.js';
import { hashPayload, computeEventHash } from '../hashing/event_hash_engine.js';
import { generateEventId } from '../utils/event_utils.js';

/**
 * Build a trust event. Optional timestamp for deterministic tests (default: Date.now()).
 */
export function buildTrustEvent(
  type: TrustEventType,
  payload: TrustEventPayload,
  timestamp?: number
): TrustEvent {
  const ts = timestamp ?? Date.now();
  const payload_hash = hashPayload(payload);
  const event_hash = computeEventHash(type, ts, payload_hash);
  const event_id = generateEventId(event_hash);

  return Object.freeze({
    event_id,
    type,
    timestamp: ts,
    payload_hash,
    event_hash,
  });
}
