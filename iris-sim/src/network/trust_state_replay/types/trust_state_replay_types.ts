/**
 * Microstep 10H — Governance Trust State Replay Engine. Types.
 */

import type { GovernanceTrustGraph, TrustScore } from '../../trust_graph/types/trust_graph_types.js';
import type { TrustDecision } from '../../trust_policy/types/trust_policy_types.js';

export interface ReplayState {
  readonly trust_graph: GovernanceTrustGraph;
  readonly trust_scores: readonly TrustScore[];
  readonly decisions: readonly TrustDecision[];
}

export interface ReplayResult {
  readonly state: ReplayState;
  readonly processed_events: number;
}

export interface ReplayVerificationResult {
  readonly snapshot_id: string;
  readonly valid: boolean;
}
