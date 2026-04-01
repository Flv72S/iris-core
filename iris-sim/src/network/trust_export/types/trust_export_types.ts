/**
 * Microstep 10I — Governance Trust Export Engine. Types.
 */

import type { GovernanceTrustSnapshot } from '../../trust_snapshot/types/trust_snapshot_types.js';
import type { GovernanceTrustGraph } from '../../trust_graph/types/trust_graph_types.js';
import type { TrustPolicy, TrustDecision } from '../../trust_policy/types/trust_policy_types.js';

export interface GovernanceTrustExportPackage {
  readonly node_id: string;
  readonly export_timestamp: number;
  readonly snapshot: GovernanceTrustSnapshot;
  readonly trust_graph: GovernanceTrustGraph;
  readonly policies: readonly TrustPolicy[];
  readonly decisions: readonly TrustDecision[];
  readonly metadata: ExportMetadata;
  readonly export_hash: string;
}

export interface ExportMetadata {
  readonly export_version: string;
  readonly iris_version: string;
  readonly exported_components: readonly string[];
}

export interface ExportValidationResult {
  readonly valid: boolean;
  readonly recomputed_hash: string;
}
