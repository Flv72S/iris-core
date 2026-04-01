/**
 * Phase 13C — Behavior Monitoring Engine. High-level API.
 */

import type { NodeBehaviorEvent, NodeBehaviorProfile } from './node_behavior_types.js';
import { recordBehaviorEvent, getEventsByNode, getAllEvents } from './behavior_event_store.js';
import { computeNodeBehaviorProfile } from './behavior_metrics_engine.js';

/**
 * Create and store a behavior event for a node action.
 */
export function recordNodeAction(
  node_id: string,
  action_type: string,
  timestamp: number
): NodeBehaviorEvent {
  const event: NodeBehaviorEvent = Object.freeze({
    node_id,
    event_type: action_type,
    event_timestamp: timestamp,
  });
  return recordBehaviorEvent(event);
}

/**
 * Get behavior profile for a node: retrieve events, compute metrics, return profile.
 */
export function getNodeBehaviorProfile(node_id: string): NodeBehaviorProfile {
  const events = getEventsByNode(node_id);
  return computeNodeBehaviorProfile(node_id, events);
}

/**
 * Return all node_ids that have at least one recorded event. Unique list.
 */
export function getActiveNodes(): readonly string[] {
  const events = getAllEvents();
  const nodeIds = new Set<string>();
  for (const e of events) {
    nodeIds.add(e.node_id);
  }
  return [...nodeIds].sort();
}
