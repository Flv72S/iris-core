/**
 * Phase 13G — Trust Governance Bridge. Deterministic event IDs.
 */

import { createHash } from 'node:crypto';
import { TrustEventType, type TrustGovernanceEvent } from './trust_event_types.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

/**
 * Build event with deterministic event_id = hash(event_type + sorted_nodes + timestamp).
 */
export function buildTrustEvent(
  event_type: TrustEventType,
  affected_nodes: readonly string[],
  severity: number,
  timestamp: number
): TrustGovernanceEvent {
  const sorted = [...affected_nodes].sort();
  const payload = String(event_type) + sorted.join(',') + String(timestamp);
  const event_id = sha256Hex(payload);
  return Object.freeze({
    event_id,
    event_type,
    affected_nodes: sorted,
    severity: clamp01(severity),
    timestamp,
  });
}
