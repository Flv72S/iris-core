/**
 * Phase 13C — Behavior Monitoring Engine.
 * Observability layer: track node activity, record events, compute behavior profiles.
 */

export type { NodeBehaviorEvent, NodeBehaviorProfile } from './node_behavior_types.js';
export { recordBehaviorEvent, getEventsByNode, getEventsInTimeRange } from './behavior_event_store.js';
export { computeNodeBehaviorProfile } from './behavior_metrics_engine.js';
export {
  recordNodeAction,
  getNodeBehaviorProfile,
  getActiveNodes,
} from './behavior_monitoring_engine.js';
