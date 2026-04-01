/**
 * Microstep 10J — Governance Trust Import & Validation Engine. Import package parser.
 */

import type {
  GovernanceTrustExportPackage,
  ExportMetadata,
} from '../../trust_export/types/trust_export_types.js';
import type { GovernanceTrustSnapshot } from '../../trust_snapshot/types/trust_snapshot_types.js';
import type { GovernanceTrustGraph, TrustNode, TrustEdge } from '../../trust_graph/types/trust_graph_types.js';
import type { TrustPolicy, TrustDecision } from '../../trust_policy/types/trust_policy_types.js';

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

function parseSnapshot(raw: unknown): GovernanceTrustSnapshot {
  if (!isRecord(raw)) throw new Error('Invalid snapshot: not an object');
  const snapshot_id = raw.snapshot_id;
  const timestamp = raw.timestamp;
  const trust_graph_hash = raw.trust_graph_hash;
  const policy_hash = raw.policy_hash;
  const decision_hash = raw.decision_hash;
  const global_hash = raw.global_hash;
  if (typeof snapshot_id !== 'string' || typeof timestamp !== 'number' ||
      typeof trust_graph_hash !== 'string' || typeof policy_hash !== 'string' ||
      typeof decision_hash !== 'string' || typeof global_hash !== 'string') {
    throw new Error('Invalid snapshot: missing or invalid fields');
  }
  return Object.freeze({
    snapshot_id,
    timestamp,
    trust_graph_hash,
    policy_hash,
    decision_hash,
    global_hash,
  });
}

function parseGraph(raw: unknown): GovernanceTrustGraph {
  if (!isRecord(raw)) throw new Error('Invalid trust_graph: not an object');
  const nodesRaw = raw.nodes;
  const edgesRaw = raw.edges;
  if (nodesRaw === undefined || edgesRaw === undefined) throw new Error('Invalid trust_graph: missing nodes or edges');
  const nodes = new Map<string, TrustNode>();
  if (nodesRaw instanceof Map) {
    for (const [id, val] of nodesRaw.entries()) {
      if (val && typeof (val as TrustNode).node_id === 'string' && typeof (val as TrustNode).public_key === 'string') {
        nodes.set(id, Object.freeze({ node_id: (val as TrustNode).node_id, public_key: (val as TrustNode).public_key }));
      }
    }
  } else if (isRecord(nodesRaw)) {
    for (const [id, val] of Object.entries(nodesRaw)) {
      if (isRecord(val) && typeof val.node_id === 'string' && typeof val.public_key === 'string') {
        nodes.set(id, Object.freeze({ node_id: val.node_id, public_key: val.public_key }));
      }
    }
  }
  const edges: TrustEdge[] = [];
  if (Array.isArray(edgesRaw)) {
    for (const e of edgesRaw) {
      if (isRecord(e) && typeof e.source_node === 'string' && typeof e.target_node === 'string' &&
          typeof e.certificate_id === 'string' && typeof e.reason === 'string') {
        edges.push(Object.freeze({
          source_node: e.source_node,
          target_node: e.target_node,
          certificate_id: e.certificate_id,
          reason: e.reason,
        }));
      }
    }
  }
  return Object.freeze({ nodes, edges });
}

function parseMetadata(raw: unknown): ExportMetadata {
  if (!isRecord(raw)) throw new Error('Invalid metadata: not an object');
  const export_version = raw.export_version;
  const iris_version = raw.iris_version;
  const exported_components = raw.exported_components;
  if (typeof export_version !== 'string' || typeof iris_version !== 'string') {
    throw new Error('Invalid metadata: missing or invalid export_version/iris_version');
  }
  if (!Array.isArray(exported_components)) throw new Error('Invalid metadata: exported_components must be array');
  const components = exported_components.filter((c): c is string => typeof c === 'string');
  return Object.freeze({ export_version, iris_version, exported_components: components });
}

function parsePolicies(raw: unknown): TrustPolicy[] {
  if (!Array.isArray(raw)) return [];
  const out: TrustPolicy[] = [];
  for (const p of raw) {
    if (!isRecord(p) || typeof p.policy_id !== 'string' || typeof p.minimum_trust_score !== 'number' ||
        typeof p.require_independent_attestations !== 'number') continue;
    out.push(Object.freeze({
      policy_id: p.policy_id,
      minimum_trust_score: p.minimum_trust_score,
      require_independent_attestations: p.require_independent_attestations,
      ...(Array.isArray(p.allowed_nodes) && { allowed_nodes: Object.freeze(p.allowed_nodes.filter((x: unknown): x is string => typeof x === 'string')) }),
      ...(Array.isArray(p.blocked_nodes) && { blocked_nodes: Object.freeze(p.blocked_nodes.filter((x: unknown): x is string => typeof x === 'string')) }),
    }));
  }
  return out;
}

function parseDecisions(raw: unknown): TrustDecision[] {
  if (!Array.isArray(raw)) return [];
  const out: TrustDecision[] = [];
  for (const d of raw) {
    if (!isRecord(d) || typeof d.node_id !== 'string' || typeof d.policy_id !== 'string') continue;
    const decision = d.decision === 'REJECT' ? 'REJECT' : 'ACCEPT';
    out.push(Object.freeze({ node_id: d.node_id, decision, policy_id: d.policy_id }));
  }
  return out;
}

/**
 * Parse and normalize a raw export package (e.g. from JSON). Throws if structure is invalid.
 */
export function parseExportPackage(raw: unknown): GovernanceTrustExportPackage {
  if (!isRecord(raw)) throw new Error('Invalid package: not an object');
  const node_id = raw.node_id;
  const export_timestamp = raw.export_timestamp;
  const export_hash = raw.export_hash;
  if (typeof node_id !== 'string') throw new Error('Invalid package: node_id required');
  if (typeof export_timestamp !== 'number' || !Number.isFinite(export_timestamp)) {
    throw new Error('Invalid package: export_timestamp required and must be number');
  }
  if (typeof export_hash !== 'string') throw new Error('Invalid package: export_hash required');
  const snapshot = parseSnapshot(raw.snapshot);
  const trust_graph = parseGraph(raw.trust_graph);
  const policies = parsePolicies(raw.policies);
  const decisions = parseDecisions(raw.decisions);
  const metadata = parseMetadata(raw.metadata);
  return Object.freeze({
    node_id,
    export_timestamp,
    snapshot,
    trust_graph,
    policies,
    decisions,
    metadata,
    export_hash,
  });
}
