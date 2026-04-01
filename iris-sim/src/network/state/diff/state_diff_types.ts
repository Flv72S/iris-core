/**
 * Phase 14C — State Diff Engine. Diff structures.
 */

import type { NodeState } from '../node_state.js';
import type { TrustState } from '../trust_state.js';
import type { GovernanceState } from '../governance_state.js';
import type { TopologyEdge } from '../topology_state.js';
import type { PolicyState } from '../policy_state.js';

export interface StateDiffMetadata {
  readonly base_version: number;
  readonly target_version: number;
  readonly author_node: string;
  readonly created_at: number;
}

export interface DiffOperation<T> {
  readonly added: Readonly<Record<string, T>>;
  readonly updated: Readonly<Record<string, T>>;
  readonly removed: readonly string[];
}

export interface StateDiff {
  readonly metadata: StateDiffMetadata;
  readonly nodes: DiffOperation<NodeState>;
  readonly trust: DiffOperation<TrustState>;
  readonly governance: DiffOperation<GovernanceState>;
  readonly topology: DiffOperation<TopologyEdge>;
  readonly policies: DiffOperation<PolicyState>;
}
