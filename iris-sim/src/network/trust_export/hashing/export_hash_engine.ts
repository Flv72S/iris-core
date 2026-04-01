/**
 * Microstep 10I — Governance Trust Export Engine. Export hashing.
 */

import { createHash } from 'node:crypto';
import type { GovernanceTrustSnapshot } from '../../trust_snapshot/types/trust_snapshot_types.js';
import type { GovernanceTrustGraph } from '../../trust_graph/types/trust_graph_types.js';
import type { TrustPolicy, TrustDecision } from '../../trust_policy/types/trust_policy_types.js';
import type { ExportMetadata } from '../types/trust_export_types.js';
import { hashTrustGraph, hashPolicies, hashDecisions } from '../../trust_snapshot/hashing/snapshot_hash_engine.js';

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function serializeMetadata(metadata: ExportMetadata): string {
  const components = [...metadata.exported_components].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return `metadata:export_version=${metadata.export_version}|iris_version=${metadata.iris_version}|components=${components.join(',')}`;
}

/**
 * Compute deterministic export hash over package contents.
 */
export function computeExportHash(
  node_id: string,
  snapshot: GovernanceTrustSnapshot,
  trust_graph: GovernanceTrustGraph,
  policies: readonly TrustPolicy[],
  decisions: readonly TrustDecision[],
  metadata: ExportMetadata,
  timestamp: number
): string {
  const graph_hash = hashTrustGraph(trust_graph);
  const policy_hash = hashPolicies(policies);
  const decision_hash = hashDecisions(decisions);
  const metadata_str = serializeMetadata(metadata);
  const payload = [
    'export',
    `node_id=${node_id}`,
    `ts=${timestamp}`,
    `snapshot=${snapshot.global_hash}`,
    `graph=${graph_hash}`,
    `policies=${policy_hash}`,
    `decisions=${decision_hash}`,
    metadata_str,
  ].join('|');
  return sha256(payload);
}
