/**
 * Phase 14C — State Diff Engine. Pure deterministic merge.
 */

import type { NetworkState } from '../network_state.js';
import type { StateDiff, DiffOperation } from './state_diff_types.js';
import type { NodeState } from '../node_state.js';
import type { TrustState } from '../trust_state.js';
import type { GovernanceState } from '../governance_state.js';
import type { TopologyEdge } from '../topology_state.js';
import type { PolicyState } from '../policy_state.js';

function mergeRecord<T>(
  current: Readonly<Record<string, T>>,
  op: DiffOperation<T>
): Record<string, T> {
  const result: Record<string, T> = { ...current };
  for (const k of Object.keys(op.added ?? {})) result[k] = op.added[k];
  for (const k of Object.keys(op.updated ?? {})) result[k] = op.updated[k];
  for (const k of op.removed ?? []) delete result[k];
  return result;
}

export class StateDiffMerger {
  /**
   * Merge state with diff. Pure and deterministic. Returns new NetworkState.
   */
  static merge(state: NetworkState, diff: StateDiff): NetworkState {
    const nodes = mergeRecord(state.nodes ?? {}, diff.nodes) as Record<string, NodeState>;
    const trust = mergeRecord(state.trust ?? {}, diff.trust) as Record<string, TrustState>;
    const governance = mergeRecord(state.governance ?? {}, diff.governance) as Record<string, GovernanceState>;
    const topology = mergeRecord(state.topology ?? {}, diff.topology) as Record<string, TopologyEdge>;
    const policies = mergeRecord(state.policies ?? {}, diff.policies) as Record<string, PolicyState>;

    return {
      metadata: {
        version: diff.metadata.target_version,
        vector_clock: { ...state.metadata.vector_clock },
        timestamp: diff.metadata.created_at,
        author_node: diff.metadata.author_node,
      },
      nodes,
      trust,
      governance,
      topology,
      policies,
    };
  }
}
