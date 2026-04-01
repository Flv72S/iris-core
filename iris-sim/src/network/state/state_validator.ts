/**
 * Phase 14A — State Model Definition. State consistency validation.
 */

import type { NetworkState } from './network_state.js';
import { isTrustScoreInRange } from './trust_state.js';
import { StateError, StateErrorCode } from './state_errors.js';

/** Valid domain identifiers (non-empty). Policies reference valid domains. */
function isNonEmptyDomain(id: string): boolean {
  return typeof id === 'string' && id.length > 0;
}

/**
 * Validate state consistency. Throws StateError if invalid.
 * Rules: no duplicate nodes (by key), trust scores in range, topology nodes exist,
 * governance references valid nodes, policies reference valid domains.
 */
export class StateValidator {
  static validate(state: NetworkState): boolean {
    if (state == null || typeof state !== 'object') {
      throw new StateError(StateErrorCode.INVALID_STATE, 'State is null or not an object');
    }
    const nodes = state.nodes ?? {};
    const trust = state.trust ?? {};
    const governance = state.governance ?? {};
    const topology = state.topology ?? {};
    const policies = state.policies ?? {};

    const nodeIds = new Set<string>(Object.keys(nodes));
    for (const key of Object.keys(nodes)) {
      const n = nodes[key];
      if (n == null || n.node_id !== key) {
        throw new StateError(StateErrorCode.DUPLICATE_NODE, `Node key mismatch or invalid: ${key}`);
      }
    }

    for (const key of Object.keys(trust)) {
      const t = trust[key];
      if (t == null || t.node_id !== key) continue;
      if (!isTrustScoreInRange(t.trust_score)) {
        throw new StateError(
          StateErrorCode.INVALID_TRUST_VALUE,
          `Trust score out of range for node ${key}: ${t.trust_score}`
        );
      }
      if (!isTrustScoreInRange(t.reputation_score)) {
        throw new StateError(
          StateErrorCode.INVALID_TRUST_VALUE,
          `Reputation score out of range for node ${key}: ${t.reputation_score}`
        );
      }
    }

    for (const key of Object.keys(topology)) {
      const e = topology[key];
      if (e == null) continue;
      if (e.edge_id !== key) {
        throw new StateError(StateErrorCode.INVALID_TOPOLOGY_EDGE, `Topology edge_id mismatch: ${key}`);
      }
      if (!nodeIds.has(e.source_node)) {
        throw new StateError(
          StateErrorCode.INVALID_TOPOLOGY_EDGE,
          `Topology edge source_node not in nodes: ${e.source_node}`
        );
      }
      if (!nodeIds.has(e.target_node)) {
        throw new StateError(
          StateErrorCode.INVALID_TOPOLOGY_EDGE,
          `Topology edge target_node not in nodes: ${e.target_node}`
        );
      }
    }

    for (const key of Object.keys(governance)) {
      const g = governance[key];
      if (g == null) continue;
      if (g.decision_id !== key) continue;
      if (!nodeIds.has(g.affected_node)) {
        throw new StateError(
          StateErrorCode.INVALID_STATE,
          `Governance decision ${key} references unknown node: ${g.affected_node}`
        );
      }
    }

    for (const key of Object.keys(policies)) {
      const p = policies[key];
      if (p == null) continue;
      if (!isNonEmptyDomain(p.source_domain)) {
        throw new StateError(
          StateErrorCode.INVALID_POLICY_REFERENCE,
          `Policy ${key} has invalid source_domain`
        );
      }
      if (!isNonEmptyDomain(p.target_domain)) {
        throw new StateError(
          StateErrorCode.INVALID_POLICY_REFERENCE,
          `Policy ${key} has invalid target_domain`
        );
      }
    }

    return true;
  }
}
