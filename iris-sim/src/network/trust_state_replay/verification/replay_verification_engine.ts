/**
 * Microstep 10H — Governance Trust State Replay Engine. Replay verification.
 */

import type { GovernanceTrustSnapshot } from '../../trust_snapshot/types/trust_snapshot_types.js';
import type { ReplayState } from '../types/trust_state_replay_types.js';
import type { ReplayVerificationResult } from '../types/trust_state_replay_types.js';
import { buildTrustSnapshot } from '../../trust_snapshot/builder/trust_snapshot_builder.js';

/**
 * Verify snapshot against replayed state: rebuild snapshot from replay state (with empty policies)
 * and same timestamp; compare global_hash.
 */
export function verifySnapshotFromReplay(
  snapshot: GovernanceTrustSnapshot,
  replay_state: ReplayState
): ReplayVerificationResult {
  const built = buildTrustSnapshot({
    trust_graph: replay_state.trust_graph,
    trust_scores: replay_state.trust_scores,
    policies: [],
    decisions: replay_state.decisions,
    timestamp: snapshot.timestamp,
  });
  const valid = built.global_hash === snapshot.global_hash;
  return Object.freeze({
    snapshot_id: snapshot.snapshot_id,
    valid,
  });
}
