/**
 * Phase 13K — Governance Automation Engine. Convert trust events to governance operations.
 */

import { TrustEventType, type TrustGovernanceEvent } from '../trust_governance_bridge/index.js';
import type { GovernanceOperation, GovernanceOperationType } from './governance_automation_types.js';

/**
 * Map trust event type to governance operation type.
 * Unknown or unmapped event types return null.
 */
function eventTypeToOperationType(eventType: TrustEventType): GovernanceOperationType | null {
  switch (eventType) {
    case TrustEventType.REPUTATION_COLLAPSE:
      return 'NODE_TRUST_REDUCTION';
    case TrustEventType.ANOMALY_CLUSTER:
      return 'NETWORK_ALERT';
    case TrustEventType.TRUST_GRAPH_ATTACK:
    case TrustEventType.SYBIL_PATTERN:
      return 'NODE_QUARANTINE';
    case TrustEventType.CONSENSUS_MANIPULATION:
      return 'NODE_TRUST_REDUCTION';
    default:
      return null;
  }
}

/**
 * Build a single governance operation from a trust governance event.
 * Returns null if the event cannot produce a valid operation (unknown type or no target node).
 */
export function buildGovernanceOperation(
  event: TrustGovernanceEvent
): GovernanceOperation | null {
  const opType = eventTypeToOperationType(event.event_type as TrustEventType);
  if (opType === null) return null;

  const target_node =
    event.affected_nodes.length > 0
      ? [...event.affected_nodes].sort((a, b) => a.localeCompare(b))[0]
      : '';
  if (target_node === '') return null;

  const reason = `Trust event: ${String(event.event_type)} (severity ${event.severity})`;

  return Object.freeze({
    operation_id: event.event_id,
    type: opType,
    target_node,
    reason,
    severity: Math.min(1, Math.max(0, event.severity)),
    timestamp: event.timestamp,
  });
}
