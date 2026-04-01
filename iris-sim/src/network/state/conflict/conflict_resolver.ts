/**
 * Phase 14D — Conflict Resolution Engine. Apply policies and produce unified state.
 */

import type { NetworkState } from '../network_state.js';
import type { ConflictResolutionResult } from './conflict_types.js';
import type { NodeState } from '../node_state.js';
import type { TrustState } from '../trust_state.js';
import type { GovernanceState } from '../governance_state.js';
import type { TopologyEdge } from '../topology_state.js';
import type { PolicyState } from '../policy_state.js';
import { ConflictDetector } from './conflict_detector.js';
import { ConflictPolicy } from './conflict_policy.js';
import { ConflictValidator } from './conflict_validator.js';
import { mergeVectorClocks } from '../state_vector_clock.js';

export class ConflictResolver {
  /**
   * Resolve conflicts between local and remote, produce unified state. Deterministic.
   */
  static resolveState(local: NetworkState, remote: NetworkState): NetworkState {
    const conflicts = ConflictDetector.detect(local, remote);
    const resolvedByEntity = new Map<string, ConflictResolutionResult>();
    for (const c of conflicts) {
      const key = c.entity_type + ':' + c.entity_id;
      resolvedByEntity.set(key, ConflictPolicy.resolve(c));
    }

    const nodes = { ...(local.nodes ?? {}) };
    const trust = { ...(local.trust ?? {}) };
    const governance = { ...(local.governance ?? {}) };
    const topology = { ...(local.topology ?? {}) };
    const policies = { ...(local.policies ?? {}) };

    for (const c of conflicts) {
      const result = resolvedByEntity.get(c.entity_type + ':' + c.entity_id)!;
      const val = result.resolved_value;
      switch (c.entity_type) {
        case 'NODE':
          if (val != null) nodes[c.entity_id] = val as NodeState;
          else delete nodes[c.entity_id];
          break;
        case 'TRUST':
          if (val != null) trust[c.entity_id] = val as TrustState;
          else delete trust[c.entity_id];
          break;
        case 'GOVERNANCE':
          if (val != null) governance[c.entity_id] = val as GovernanceState;
          else delete governance[c.entity_id];
          break;
        case 'TOPOLOGY':
          if (val != null) topology[c.entity_id] = val as TopologyEdge;
          else delete topology[c.entity_id];
          break;
        case 'POLICY':
          if (val != null) policies[c.entity_id] = val as PolicyState;
          else delete policies[c.entity_id];
          break;
      }
    }

    const mergedVc = mergeVectorClocks(local.metadata.vector_clock ?? {}, remote.metadata.vector_clock ?? {});
    const state: NetworkState = {
      metadata: {
        version: Math.max(local.metadata.version, remote.metadata.version),
        vector_clock: mergedVc,
        timestamp: Math.max(local.metadata.timestamp, remote.metadata.timestamp),
        author_node: local.metadata.author_node,
      },
      nodes,
      trust,
      governance,
      topology,
      policies,
    };

    ConflictValidator.validate(state);
    return state;
  }
}
