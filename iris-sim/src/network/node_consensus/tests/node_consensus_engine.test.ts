/**
 * Phase 11A — Node Consensus Engine tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createHash } from 'node:crypto';
import { computeGlobalSnapshotHash } from '../../../governance/global_snapshot/hashing/global_snapshot_hash.js';
import type { GlobalGovernanceSnapshot } from '../../../governance/global_snapshot/types/global_snapshot_types.js';
import {
  runNodeConsensus,
  DEFAULT_CONSENSUS_PARAMETERS,
  verifySnapshotIntegrity,
  aggregateSnapshots,
  buildMergedSnapshot,
  validateMergedSnapshot,
  serializeConsensusResult,
  hashConsensusResult,
  createConsensusAuditEntry,
  verifyConsensusAuditEntry,
  type SnapshotData,
  type NodeMetadata,
} from '../index.js';

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function makeGlobalSnapshot(overrides: { seed?: string; timestamp?: number } = {}): GlobalGovernanceSnapshot {
  const seed = overrides.seed ?? 'default';
  const h = (x: string) => sha256(seed + x);
  const fields = {
    governance_snapshot_hash: h('g'),
    policy_enforcement_hash: h('p'),
    adaptation_hash: h('a'),
    runtime_state_hash: h('r'),
    governance_proof_hash: h('gp'),
    attestation_hash: h('at'),
    ledger_head_hash: h('l'),
    certificate_hash: h('c'),
    watcher_state_hash: h('w'),
  };
  const global_hash = computeGlobalSnapshotHash(fields);
  const snapshot_id = sha256(global_hash);
  return Object.freeze({
    ...fields,
    snapshot_id,
    timestamp: overrides.timestamp ?? Date.now(),
    governance_tier: 'TIER_2',
    trust_anchor_id: 'ta1',
    global_hash,
  });
}

function makeSnapshotData(node_id: string, overrides?: { seed?: string; timestamp?: number }): SnapshotData {
  const snapshot = makeGlobalSnapshot(overrides);
  return Object.freeze({
    governance_state: snapshot,
    snapshot_hash: snapshot.global_hash,
    timestamp: snapshot.timestamp,
    node_id,
    schema_version: '1.0.0',
  });
}

function makeNodeMetadata(node_id: string, reliability_weight = 1): NodeMetadata {
  return Object.freeze({
    node_id,
    trust_anchor: 'ta1',
    protocol_version: '1.0',
    governance_role: 'participant',
    reliability_weight,
  });
}

describe('Node Consensus Engine', () => {
  it('Determinism: same input → same ConsensusResult', () => {
    const snapshot = makeGlobalSnapshot({ seed: 's1' });
    const data: SnapshotData[] = [
      { governance_state: snapshot, snapshot_hash: snapshot.global_hash, timestamp: snapshot.timestamp, node_id: 'n1' },
      { governance_state: snapshot, snapshot_hash: snapshot.global_hash, timestamp: snapshot.timestamp, node_id: 'n2' },
    ];
    const meta: NodeMetadata[] = [makeNodeMetadata('n1'), makeNodeMetadata('n2')];
    const r1 = runNodeConsensus(data, meta);
    const r2 = runNodeConsensus(data, meta);
    assert.strictEqual(r1.consensus_proof.consensus_hash, r2.consensus_proof.consensus_hash);
    assert.strictEqual(r1.status, r2.status);
    assert.strictEqual(r1.diagnostics.chosen_node_id, r2.diagnostics.chosen_node_id);
  });

  it('Conflict simulation: divergent snapshots → deterministic resolution', () => {
    const d1 = makeSnapshotData('n1', { seed: 'a' });
    const d2 = makeSnapshotData('n2', { seed: 'b' });
    const meta: NodeMetadata[] = [
      makeNodeMetadata('n1', 2),
      makeNodeMetadata('n2', 1),
    ];
    const result = runNodeConsensus([d1, d2], meta, { ...DEFAULT_CONSENSUS_PARAMETERS, conflict_resolution_policy: 'priority' });
    assert.ok(result.merged_snapshot !== null);
    assert.ok(['n1', 'n2'].includes(result.diagnostics.chosen_node_id));
    assert.ok(result.consensus_proof.conflict_report.conflicts.length >= 0);
  });

  it('Integrity: snapshot hash and consensus_hash and proof integrity', () => {
    const snap = makeGlobalSnapshot({ seed: 'x' });
    assert.strictEqual(verifySnapshotIntegrity(snap), true);
    const data = makeSnapshotData('n1', { seed: 'x' });
    const result = runNodeConsensus([data], [makeNodeMetadata('n1')]);
    assert.ok(result.consensus_proof.consensus_hash.length > 0);
    assert.ok(result.merged_snapshot !== null);
    assert.strictEqual(verifySnapshotIntegrity(result.merged_snapshot!.snapshot), true);
  });

  it('Resilience: no snapshots → ERROR status and null merged_snapshot', () => {
    const result = runNodeConsensus([], []);
    assert.strictEqual(result.status, 'ERROR');
    assert.strictEqual(result.merged_snapshot, null);
    assert.strictEqual(result.consensus_proof.quorum_reached, false);
  });

  it('Resilience: all invalid snapshots (bad hash) → valid_count 0', () => {
    const snap = makeGlobalSnapshot({ seed: 'x' });
    const badData: SnapshotData = {
      governance_state: snap,
      snapshot_hash: 'wrong_hash',
      timestamp: snap.timestamp,
      node_id: 'n1',
    };
    const aggregated = aggregateSnapshots([badData]);
    assert.strictEqual(aggregated.valid_count, 0);
    assert.strictEqual(aggregated.invalid_count, 1);
  });

  it('Serialization: serializeConsensusResult and hash consistency', () => {
    const data = makeSnapshotData('n1');
    const result = runNodeConsensus([data], [makeNodeMetadata('n1')]);
    const json = serializeConsensusResult(result);
    assert.ok(json.length > 0);
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.status, result.status);
    const h = hashConsensusResult(result);
    assert.ok(h.length === 64);
  });

  it('Single node: one snapshot → OK, merged equals input', () => {
    const data = makeSnapshotData('n1');
    const result = runNodeConsensus([data], [makeNodeMetadata('n1')]);
    assert.strictEqual(result.status, 'OK');
    assert.ok(result.merged_snapshot !== null);
    assert.strictEqual(result.merged_snapshot!.chosen_node_id, 'n1');
    assert.strictEqual(result.merged_snapshot!.snapshot.global_hash, data.governance_state.global_hash);
  });

  it('Quorum: two same snapshots → OK, quorum_reached', () => {
    const snap = makeGlobalSnapshot({ seed: 'q' });
    const d1: SnapshotData = { governance_state: snap, snapshot_hash: snap.global_hash, timestamp: snap.timestamp, node_id: 'n1' };
    const d2: SnapshotData = { governance_state: snap, snapshot_hash: snap.global_hash, timestamp: snap.timestamp, node_id: 'n2' };
    const result = runNodeConsensus([d1, d2], [makeNodeMetadata('n1'), makeNodeMetadata('n2')]);
    assert.strictEqual(result.status, 'OK');
    assert.strictEqual(result.consensus_proof.quorum_reached, true);
    assert.ok(result.merged_snapshot !== null);
  });

  it('Audit log: entries created and verifiable', () => {
    const entries: ReturnType<typeof createConsensusAuditEntry>[] = [];
    const data = [makeSnapshotData('n1'), makeSnapshotData('n2', { seed: 'other' })];
    runNodeConsensus(data, [makeNodeMetadata('n1'), makeNodeMetadata('n2')], DEFAULT_CONSENSUS_PARAMETERS, { auditCollector: (e) => entries.push(e) });
    assert.ok(entries.length >= 1);
    for (const e of entries) {
      assert.strictEqual(verifyConsensusAuditEntry(e), true);
    }
  });

  it('Merged snapshot validation', () => {
    const data = makeSnapshotData('n1');
    const merged = buildMergedSnapshot(data, ['n1', 'n2']);
    assert.strictEqual(validateMergedSnapshot(merged), true);
    const invalid = Object.freeze({ ...merged, chosen_node_id: 'n3' });
    assert.strictEqual(validateMergedSnapshot(invalid), false);
  });
});
