/**
 * Microstep 10K — Governance Trust Federation Engine. Federation snapshot.
 */

import { createHash } from 'node:crypto';
import type { FederatedTrustGraph, FederationSnapshot } from '../types/federation_types.js';

function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function hashGraph(graph: FederatedTrustGraph): string {
  const nodesStr = graph.nodes
    .map((n) => `${n.node_id}:${n.trust_score}`)
    .join('|');
  const edgesStr = graph.edges
    .map((e) => `${e.source_node}\t${e.target_node}\t${e.weight}`)
    .join('|');
  return sha256(`federation:nodes=${nodesStr};edges=${edgesStr}`);
}

/**
 * Create a federation snapshot with deterministic hash. Optional timestamp for tests.
 */
export function createFederationSnapshot(
  graph: FederatedTrustGraph,
  timestamp?: number
): FederationSnapshot {
  const ts = timestamp ?? Date.now();
  const snapshot_hash = hashGraph(graph);
  const federation_id = snapshot_hash;
  return Object.freeze({
    federation_id,
    timestamp: ts,
    graph,
    snapshot_hash,
  });
}
