/**
 * Microstep 10H — Governance Trust State Replay Engine. Replay processor.
 */

import type { TrustEvent, TrustEventPayload } from '../../trust_event_log/types/trust_event_types.js';
import type { ReplayResult, ReplayState } from '../types/trust_state_replay_types.js';
import { TrustStateBuilder } from '../builder/trust_state_builder.js';

export type PayloadProvider = (event: TrustEvent) => TrustEventPayload | undefined;

/**
 * Process event stream and build replay state. Optional getPayload to reconstruct state from payloads.
 * When getPayload is not provided, only event count is updated; state remains empty.
 */
export function processReplay(
  events: TrustEvent[],
  getPayload?: PayloadProvider
): ReplayResult {
  const builder = new TrustStateBuilder();
  for (const event of events) {
    const payload = getPayload?.(event);
    if (!payload) continue;
    switch (event.type) {
      case 'CROSS_NODE_VERIFICATION':
        builder.applyVerificationEvent(event, payload);
        break;
      case 'TRUST_GRAPH_UPDATED':
        builder.applyGraphUpdate(event, payload);
        break;
      case 'TRUST_POLICY_DECISION':
        builder.applyPolicyDecision(event, payload);
        break;
      case 'TRUST_SNAPSHOT_CREATED':
        builder.applySnapshotEvent(event, payload);
        break;
    }
  }
  const { trust_graph, trust_scores, decisions } = builder.build();
  const state: ReplayState = Object.freeze({
    trust_graph,
    trust_scores,
    decisions,
  });
  return Object.freeze({
    state,
    processed_events: events.length,
  });
}
