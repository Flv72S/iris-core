/**
 * Phase 14C — State Diff Engine. Deterministic diff generation.
 */

import type { NetworkState } from '../network_state.js';
import type { StateDiff, StateDiffMetadata, DiffOperation } from './state_diff_types.js';
import type { NodeState } from '../node_state.js';
import type { TrustState } from '../trust_state.js';
import type { GovernanceState } from '../governance_state.js';
import type { TopologyEdge } from '../topology_state.js';
import type { PolicyState } from '../policy_state.js';

/** Canonical stringify for value comparison (deterministic). */
function canonicalValue(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonicalValue).join(',') + ']';
  const keys = Object.keys(v as Record<string, unknown>).sort((a, b) => a.localeCompare(b));
  const parts = keys.map((k) => JSON.stringify(k) + ':' + canonicalValue((v as Record<string, unknown>)[k]));
  return '{' + parts.join(',') + '}';
}

function sortedKeys(record: Readonly<Record<string, unknown>>): string[] {
  return Object.keys(record).sort((a, b) => a.localeCompare(b));
}

function computeDiff<T>(
  base: Readonly<Record<string, T>>,
  target: Readonly<Record<string, T>>
): DiffOperation<T> {
  const added: Record<string, T> = {};
  const updated: Record<string, T> = {};
  const removed: string[] = [];
  const baseKeys = new Set(sortedKeys(base as Readonly<Record<string, unknown>>));
  const targetKeys = new Set(sortedKeys(target as Readonly<Record<string, unknown>>));

  for (const k of targetKeys) {
    const baseVal = base[k];
    const targetVal = target[k];
    if (baseVal === undefined) {
      added[k] = targetVal;
    } else if (canonicalValue(baseVal) !== canonicalValue(targetVal)) {
      updated[k] = targetVal;
    }
  }
  for (const k of baseKeys) {
    if (!targetKeys.has(k)) removed.push(k);
  }
  removed.sort((a, b) => a.localeCompare(b));

  return { added, updated, removed };
}

export class StateDiffGenerator {
  /**
   * Generate deterministic diff from base to target. Same (base, target) → same diff.
   */
  static generate(base: NetworkState, target: NetworkState): StateDiff {
    const metadata: StateDiffMetadata = {
      base_version: base.metadata.version,
      target_version: target.metadata.version,
      author_node: target.metadata.author_node,
      created_at: target.metadata.timestamp,
    };

    const nodes = computeDiff(base.nodes ?? {}, target.nodes ?? {}) as DiffOperation<NodeState>;
    const trust = computeDiff(base.trust ?? {}, target.trust ?? {}) as DiffOperation<TrustState>;
    const governance = computeDiff(base.governance ?? {}, target.governance ?? {}) as DiffOperation<GovernanceState>;
    const topology = computeDiff(base.topology ?? {}, target.topology ?? {}) as DiffOperation<TopologyEdge>;
    const policies = computeDiff(base.policies ?? {}, target.policies ?? {}) as DiffOperation<PolicyState>;

    return {
      metadata,
      nodes,
      trust,
      governance,
      topology,
      policies,
    };
  }
}
