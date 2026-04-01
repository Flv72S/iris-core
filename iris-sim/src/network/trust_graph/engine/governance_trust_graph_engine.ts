/**
 * Microstep 10D — Governance Trust Graph Engine. Core engine.
 */

import type { GovernanceCertificateRegistry } from '../../governance_registry/registry/governance_certificate_registry.js';
import type { TrustNode, GovernanceTrustGraph } from '../types/trust_graph_types.js';
import { buildTrustGraph } from '../builder/trust_graph_builder.js';

/**
 * Generate the governance trust graph from the registry and the local (verifier) node.
 * Flow: registry → builder → normalized graph (deterministic edges).
 */
export function generateGovernanceTrustGraph(
  registry: GovernanceCertificateRegistry,
  localNode: TrustNode
): GovernanceTrustGraph {
  return buildTrustGraph(registry, localNode);
}
