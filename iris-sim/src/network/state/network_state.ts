/**
 * Phase 14A — State Model Definition. Global IRIS distributed state (map-based).
 */

import type { StateMetadata } from './state_types.js';
import type { NodeState } from './node_state.js';
import type { TrustState } from './trust_state.js';
import type { GovernanceState } from './governance_state.js';
import type { TopologyEdge } from './topology_state.js';
import type { PolicyState } from './policy_state.js';

export interface NetworkState {
  readonly metadata: StateMetadata;
  /** key = node_id */
  readonly nodes: Readonly<Record<string, NodeState>>;
  /** key = node_id */
  readonly trust: Readonly<Record<string, TrustState>>;
  /** key = decision_id */
  readonly governance: Readonly<Record<string, GovernanceState>>;
  /** key = edge_id (deterministic) */
  readonly topology: Readonly<Record<string, TopologyEdge>>;
  /** key = policy_id */
  readonly policies: Readonly<Record<string, PolicyState>>;
}
