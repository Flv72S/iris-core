/**
 * Microstep 10J — Governance Trust Import & Validation Engine. Tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTrustGraph, TrustNode } from '../../trust_graph/types/trust_graph_types.js';
import type { TrustPolicy } from '../../trust_policy/types/trust_policy_types.js';
import { buildTrustSnapshot } from '../../trust_snapshot/builder/trust_snapshot_builder.js';
import { buildGovernanceExportPackage } from '../../trust_export/builder/export_package_builder.js';
import { generateExportMetadata } from '../../trust_export/metadata/export_metadata_engine.js';
import { parseExportPackage } from '../parser/import_package_parser.js';
import { validateExportHash } from '../validation/import_hash_validator.js';
import { validateSnapshotConsistency } from '../validation/snapshot_validator.js';
import { validatePolicies } from '../validation/policy_validator.js';
import { validateTrustGraph } from '../validation/trust_graph_validator.js';
import { ImportQuarantineWorkspace } from '../quarantine/import_quarantine_workspace.js';
import { importGovernancePackage } from '../engine/trust_import_engine.js';
import { getImportedPackages, getImportedPackage, countValidImports } from '../query/import_query_api.js';

function makeGraph(
  nodes: TrustNode[],
  edges: { source: string; target: string; cert_id: string }[]
): GovernanceTrustGraph {
  const nodeMap = new Map<string, TrustNode>();
  for (const n of nodes) nodeMap.set(n.node_id, n);
  const edgeList = edges.map((e) => ({
    source_node: e.source,
    target_node: e.target,
    certificate_id: e.cert_id,
    reason: 'verified',
  }));
  return Object.freeze({ nodes: new Map(nodeMap), edges: edgeList });
}

const FIXED_TS = 1000000;
const NODE_ID = 'node-import-test';

function makeValidPackage() {
  const graph = makeGraph([{ node_id: 'n1', public_key: 'pk' }], []);
  const snapshot = buildTrustSnapshot({
    trust_graph: graph,
    trust_scores: [{ node_id: 'n1', score: 0 }],
    policies: [],
    decisions: [],
    timestamp: FIXED_TS,
  });
  const metadata = generateExportMetadata();
  return buildGovernanceExportPackage(NODE_ID, snapshot, graph, [], [], metadata, FIXED_TS);
}

describe('Governance Trust Import Engine', () => {
  it('1 — Parsing pacchetto valido', () => {
    const pkg = makeValidPackage();
    const raw = {
      node_id: pkg.node_id,
      export_timestamp: pkg.export_timestamp,
      snapshot: pkg.snapshot,
      trust_graph: pkg.trust_graph,
      policies: pkg.policies,
      decisions: pkg.decisions,
      metadata: pkg.metadata,
      export_hash: pkg.export_hash,
    };
    const parsed = parseExportPackage(raw);
    assert.strictEqual(parsed.node_id, pkg.node_id);
    assert.strictEqual(parsed.export_hash, pkg.export_hash);
  });

  it('2 — Parsing pacchetto non valido', () => {
    assert.throws(() => parseExportPackage(null));
    assert.throws(() => parseExportPackage(undefined));
    assert.throws(() => parseExportPackage({}));
    assert.throws(() => parseExportPackage({ node_id: 'x' }));
  });

  it('3 — Validazione hash corretta', () => {
    const pkg = makeValidPackage();
    assert.strictEqual(validateExportHash(pkg), true);
  });

  it('4 — Hash alterato → invalidazione', () => {
    const pkg = makeValidPackage();
    const tampered = { ...pkg, export_hash: 'wrong-hash' };
    assert.strictEqual(validateExportHash(tampered), false);
  });

  it('5 — Validazione snapshot', () => {
    const pkg = makeValidPackage();
    assert.strictEqual(validateSnapshotConsistency(pkg.snapshot), true);
    assert.strictEqual(validateSnapshotConsistency({} as Parameters<typeof validateSnapshotConsistency>[0]), false);
  });

  it('6 — Validazione policy', () => {
    const validPolicy: TrustPolicy = {
      policy_id: 'pol-1',
      minimum_trust_score: 0,
      require_independent_attestations: 0,
    };
    assert.strictEqual(validatePolicies([validPolicy]), true);
    assert.strictEqual(validatePolicies([{ ...validPolicy, policy_id: '' }]), false);
  });

  it('7 — Validazione trust graph', () => {
    const graph = makeGraph([{ node_id: 'a', public_key: 'pk' }], []);
    assert.strictEqual(validateTrustGraph(graph), true);
    const badGraph = { nodes: new Map(), edges: [{ source_node: 'x', target_node: 'y', certificate_id: 'c', reason: 'r' }] };
    assert.strictEqual(validateTrustGraph(badGraph as GovernanceTrustGraph), false);
  });

  it('8 — Inserimento workspace', () => {
    const workspace = new ImportQuarantineWorkspace();
    const pkg = makeValidPackage();
    const result = importGovernancePackage(pkg, workspace);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.validation_errors.length, 0);
    const entries = workspace.getEntries();
    assert.strictEqual(entries.length, 1);
    assert.strictEqual(entries[0].package_id, pkg.export_hash);
    assert.strictEqual(entries[0].validated, true);
  });

  it('9 — Query pacchetti importati', () => {
    const workspace = new ImportQuarantineWorkspace();
    const pkg = makeValidPackage();
    importGovernancePackage(pkg, workspace);
    const view = workspace.getWorkspace();
    const all = getImportedPackages(view);
    assert.strictEqual(all.length, 1);
    const one = getImportedPackage(view, pkg.export_hash);
    assert.ok(one);
    assert.strictEqual(one!.pkg.node_id, NODE_ID);
    assert.strictEqual(countValidImports(view), 1);
  });

  it('10 — Determinismo import', () => {
    const workspace = new ImportQuarantineWorkspace();
    const pkg = makeValidPackage();
    const r1 = importGovernancePackage(pkg, workspace);
    const r2 = importGovernancePackage(pkg, workspace);
    assert.strictEqual(r1.package_id, r2.package_id);
    assert.strictEqual(r1.valid, r2.valid);
    assert.deepStrictEqual(r1.validation_errors, r2.validation_errors);
  });
});
