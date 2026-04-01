/**
 * Microstep 10K — Governance Trust Federation Engine. Core engine.
 */

import type { GovernanceTrustGraph } from '../../trust_graph/types/trust_graph_types.js';
import type { TrustPolicy } from '../../trust_policy/types/trust_policy_types.js';
import type { GovernanceTrustExportPackage } from '../../trust_export/types/trust_export_types.js';
import type { FederationSnapshot } from '../types/federation_types.js';
import { buildFederatedTrustGraph } from '../builder/federation_graph_builder.js';
import { computeFederatedTrustScores } from '../scoring/federation_trust_scoring_engine.js';
import { resolveFederationPolicies } from '../policy/federation_policy_resolver.js';
import { createFederationSnapshot } from '../snapshot/federation_snapshot_engine.js';

/**
 * Build federation from local graph, imported packages, and local policies.
 * Returns a federation snapshot (graph with federated trust scores). Policy resolution is run for consistency but not stored in snapshot.
 */
export function buildFederation(
  local_graph: GovernanceTrustGraph,
  imported_packages: readonly GovernanceTrustExportPackage[],
  local_policies: readonly TrustPolicy[],
  timestamp?: number
): FederationSnapshot {
  const rawGraph = buildFederatedTrustGraph(local_graph, imported_packages);
  const graphWithScores = computeFederatedTrustScores(rawGraph);
  resolveFederationPolicies(local_policies, imported_packages);
  return createFederationSnapshot(graphWithScores, timestamp);
}
