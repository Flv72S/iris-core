/**
 * Microstep 10G — Governance Trust Event Log Engine. Event utilities.
 */

import type { TrustEventPayload } from '../types/trust_event_types.js';

function serializeValue(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (typeof val === 'string') return JSON.stringify(val);
  if (typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) return '[' + val.map(serializeValue).join(',') + ']';
  if (typeof val === 'object') {
    const keys = Object.keys(val as Record<string, unknown>).sort();
    const parts = keys.map(
      (k) => JSON.stringify(k) + ':' + serializeValue((val as Record<string, unknown>)[k])
    );
    return '{' + parts.join(',') + '}';
  }
  return String(val);
}

/**
 * Serialize payload deterministically for stable hashing (sorted keys).
 */
export function serializeEventPayload(payload: TrustEventPayload): string {
  const parts = [
    '"reference_id":' + JSON.stringify(payload.reference_id),
    '"source":' + JSON.stringify(payload.source),
  ];
  if (payload.metadata !== undefined && payload.metadata !== null) {
    parts.push('"metadata":' + serializeValue(payload.metadata));
  }
  return '{' + parts.join(',') + '}';
}

/**
 * Generate event id from event hash (deterministic, unique per event).
 */
export function generateEventId(event_hash: string): string {
  return event_hash;
}
