/**
 * Microstep 10I — Governance Trust Export Engine. Export package builder.
 */

import type {
  GovernanceTrustExportPackage,
  ExportMetadata,
} from '../types/trust_export_types.js';
import type { GovernanceTrustSnapshot } from '../../trust_snapshot/types/trust_snapshot_types.js';
import type { GovernanceTrustGraph } from '../../trust_graph/types/trust_graph_types.js';
import type { TrustPolicy, TrustDecision } from '../../trust_policy/types/trust_policy_types.js';
import { computeExportHash } from '../hashing/export_hash_engine.js';

/**
 * Build governance export package. Optional export_timestamp for deterministic tests.
 */
export function buildGovernanceExportPackage(
  node_id: string,
  snapshot: GovernanceTrustSnapshot,
  trust_graph: GovernanceTrustGraph,
  policies: readonly TrustPolicy[],
  decisions: readonly TrustDecision[],
  metadata: ExportMetadata,
  export_timestamp?: number
): GovernanceTrustExportPackage {
  const export_ts = export_timestamp ?? Date.now();
  const export_hash = computeExportHash(
    node_id,
    snapshot,
    trust_graph,
    policies,
    decisions,
    metadata,
    export_ts
  );
  return Object.freeze({
    node_id,
    export_timestamp: export_ts,
    snapshot,
    trust_graph,
    policies: [...policies],
    decisions: [...decisions],
    metadata,
    export_hash,
  });
}
