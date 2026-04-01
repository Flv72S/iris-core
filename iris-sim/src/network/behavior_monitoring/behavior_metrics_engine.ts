/**
 * Phase 13C — Behavior Monitoring Engine. Deterministic metrics from events.
 */

import type { NodeBehaviorEvent, NodeBehaviorProfile } from './node_behavior_types.js';

/** Event type → profile field. Deterministic mapping. */
const ACTION_SUBMISSION = 'action_submission';
const CONSENSUS_VOTE = 'consensus_vote';
const VALIDATION_PERFORMED = 'validation_performed';
const GOVERNANCE_PARTICIPATION = 'governance_participation';

/**
 * Compute behavior profile from event list. Deterministic.
 */
export function computeNodeBehaviorProfile(
  node_id: string,
  events: readonly NodeBehaviorEvent[]
): NodeBehaviorProfile {
  let action_count = 0;
  let consensus_votes = 0;
  let validations_performed = 0;
  let governance_actions = 0;
  let last_activity_timestamp = 0;

  for (const e of events) {
    if (e.event_timestamp > last_activity_timestamp) {
      last_activity_timestamp = e.event_timestamp;
    }
    switch (e.event_type) {
      case ACTION_SUBMISSION:
        action_count += 1;
        break;
      case CONSENSUS_VOTE:
        consensus_votes += 1;
        break;
      case VALIDATION_PERFORMED:
        validations_performed += 1;
        break;
      case GOVERNANCE_PARTICIPATION:
        governance_actions += 1;
        break;
      default:
        break;
    }
  }

  return Object.freeze({
    node_id,
    total_events: events.length,
    action_count,
    consensus_votes,
    validations_performed,
    governance_actions,
    last_activity_timestamp,
  });
}
