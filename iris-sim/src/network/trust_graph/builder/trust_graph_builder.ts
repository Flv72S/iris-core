/**
 * Microstep 10D — Governance Trust Graph Engine. Trust graph builder.
 */

import type { GovernanceCertificateRegistry } from '../../governance_registry/registry/governance_certificate_registry.js';
import type { TrustNode, TrustEdge, GovernanceTrustGraph } from '../types/trust_graph_types.js';
import { edgeExists, sortEdgesDeterministically } from '../utils/graph_utils.js';

const ISSUING_NODE_ID_KEY = 'issuing_node_id';
const ISSUING_NODE_PUBLIC_KEY_KEY = 'issuing_node_public_key';

/**
 * Build the trust graph from the registry and the local (verifier) node.
 * Edge: source_node = verifier (local), target_node = issuer (from certificate audit_metadata).
 * Deterministic: no duplicate edges, edges sorted.
 */
export function buildTrustGraph(
  registry: GovernanceCertificateRegistry,
  localNode: TrustNode
): GovernanceTrustGraph {
  const nodes = new Map<string, TrustNode>();
  const edges: TrustEdge[] = [];

  nodes.set(localNode.node_id, localNode);

  const records = registry.listCertificates();
  for (const record of records) {
    const issuingNodeId = record.certificate.audit_metadata[ISSUING_NODE_ID_KEY];
    if (typeof issuingNodeId !== 'string' || !issuingNodeId) continue;

    const publicKey =
      typeof record.certificate.audit_metadata[ISSUING_NODE_PUBLIC_KEY_KEY] === 'string'
        ? (record.certificate.audit_metadata[ISSUING_NODE_PUBLIC_KEY_KEY] as string)
        : '';

    const targetNode: TrustNode = { node_id: issuingNodeId, public_key: publicKey };
    if (!nodes.has(issuingNodeId)) {
      nodes.set(issuingNodeId, targetNode);
    }

    const edge: TrustEdge = {
      source_node: localNode.node_id,
      target_node: issuingNodeId,
      certificate_id: record.certificate_id,
      reason: 'verified',
    };
    if (!edgeExists(edges, edge)) {
      edges.push(edge);
    }
  }

  const sortedEdges = sortEdgesDeterministically(edges);
  return Object.freeze({
    nodes: new Map(nodes),
    edges: sortedEdges,
  });
}
