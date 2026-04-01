/**
 * Step 9C — Governance Historical Query Engine tests.
 */

import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import type { GlobalGovernanceSnapshot } from '../../global_snapshot/types/global_snapshot_types.js';
import { computeAdaptationSnapshot } from '../../self_adaptation/engine/self_adaptation_engine.js';
import { evaluateRuntimeAction } from '../../runtime_gate/engine/governance_runtime_gate.js';
import { buildGovernanceProof } from '../../cryptographic_proof/proof/governance_proof_builder.js';
import { buildGovernanceAttestation } from '../../attestation/builder/attestation_builder.js';
import { createLedger, appendAttestation, getLatestEntry } from '../../ledger/chain/ledger_chain.js';
import { buildGovernanceCertificate } from '../../governance_certificate_engine/builder/governance_certificate_builder.js';
import { TRUST_ANCHOR_REGISTRY } from '../../trust_anchor/registry/trust_anchor_registry.js';
import { runGovernanceCheck } from '../../watcher/watcher/governance_watcher.js';
import { buildGlobalGovernanceSnapshot } from '../../global_snapshot/builder/global_snapshot_builder.js';
import { computeGlobalSnapshotHash } from '../../global_snapshot/hashing/global_snapshot_hash.js';
import { computeGovernanceDiff } from '../../diff_engine/engine/governance_diff_engine.js';
import { buildGovernanceTimeline } from '../../timeline_index/builder/governance_timeline_builder.js';
import { queryGovernanceAtTimestamp } from '../engine/governance_historical_query_engine.js';
import { verifyGovernanceHistoricalQuery } from '../verify/governance_historical_query_verifier.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

function makeSnapshot(overrides: {
  tier?: GovernanceTierSnapshot['tier'];
  score?: number;
}): GovernanceTierSnapshot {
  return Object.freeze({
    modelVersion: '7A_v1.0',
    score: overrides.score ?? 0.5,
    tier: overrides.tier ?? 'TIER_2_CONTROLLED',
    computedAt: 1000,
    normalizedMetrics: Object.freeze({
      flipStability: 0.8,
      invariantIntegrity: 0.9,
      entropyControl: 0.7,
      violationPressure: 0.2,
    }),
    hardCapApplied: false,
    structuralCapApplied: false,
  });
}

const emptyEnforcement: PolicyEnforcementResult = Object.freeze({
  blockedFeatures: [],
  allowedFeatures: [],
});

function buildGlobalSnapshot(
  snapshot: GovernanceTierSnapshot,
  timestampOverride?: number
): GlobalGovernanceSnapshot {
  const enforcement = emptyEnforcement;
  const adaptation = computeAdaptationSnapshot(snapshot, enforcement);
  const runtimeDecision = evaluateRuntimeAction(
    { action: 'run', requestedFeatures: ['advanced_analysis'] },
    snapshot,
    enforcement
  );
  const governanceProof = buildGovernanceProof(
    snapshot,
    enforcement,
    adaptation,
    runtimeDecision
  );
  const attestation = buildGovernanceAttestation(
    governanceProof,
    adaptation,
    runtimeDecision
  );
  const ledger = createLedger();
  appendAttestation(ledger, attestation);
  const ledgerHead = getLatestEntry(ledger);
  if (ledgerHead === undefined) {
    throw new Error('Expected ledger head after attestation append');
  }
  const certificate = buildGovernanceCertificate(
    snapshot,
    enforcement,
    adaptation,
    runtimeDecision,
    governanceProof
  );
  const watcherState = runGovernanceCheck({
    governanceSnapshot: snapshot,
    policyEnforcement: enforcement,
    runtimeDecision,
    certifiedSnapshotHash: certificate.governance_snapshot_hash,
    ledger,
  });

  const snap = buildGlobalGovernanceSnapshot(
    snapshot,
    enforcement,
    adaptation,
    runtimeDecision,
    governanceProof,
    attestation,
    ledgerHead,
    certificate,
    TRUST_ANCHOR_REGISTRY.root,
    watcherState
  );
  if (timestampOverride === undefined) return snap;
  const next = { ...snap, timestamp: timestampOverride };
  const global_hash = computeGlobalSnapshotHash(next);
  return Object.freeze({
    ...next,
    snapshot_id: sha256Hex(global_hash),
    global_hash,
  });
}

function cloneSnapshot(
  snapshot: GlobalGovernanceSnapshot,
  overrides: Partial<GlobalGovernanceSnapshot>
): GlobalGovernanceSnapshot {
  const next = { ...snapshot, ...overrides };
  const global_hash = computeGlobalSnapshotHash(next);
  return Object.freeze({
    ...next,
    snapshot_id: sha256Hex(global_hash),
    global_hash,
  });
}

describe('Governance Historical Query Engine', () => {
  it('Test 1 — Query at genesis snapshot time', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.75 }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const result = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs: [],
      timestamp: genesis.timestamp,
    });

    assert.strictEqual(result.applied_diffs.length, 0);
    assert.strictEqual(result.snapshot_hash_at_time, genesis.global_hash);
    assert.strictEqual(result.reconstructed_snapshot_hash, genesis.global_hash);
    assert.strictEqual(result.query_timestamp, genesis.timestamp);
    assert.ok(result.query_hash);
  });

  it('Test 2 — Query after one diff', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.6 }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'a'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const result = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs: [diff],
      timestamp: 2000,
    });

    assert.strictEqual(result.applied_diffs.length, 1);
    assert.strictEqual(result.applied_diffs[0], diff.diff_hash);
    assert.strictEqual(result.snapshot_hash_at_time, s1.global_hash);
    assert.strictEqual(result.reconstructed_snapshot_hash, s1.global_hash);
  });

  it('Test 3 — Query after multiple diffs', () => {
    const s0 = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_1_RESTRICTED' }), 1000);
    const s1 = cloneSnapshot(s0, { certificate_hash: 'b'.repeat(64), timestamp: 2000 });
    const s2 = cloneSnapshot(s1, { ledger_head_hash: 'c'.repeat(64), timestamp: 3000 });
    const s3 = cloneSnapshot(s2, { governance_tier: 'TIER_3_STABLE', timestamp: 4000 });
    const d01 = computeGovernanceDiff(s0, s1);
    const d12 = computeGovernanceDiff(s1, s2);
    const d23 = computeGovernanceDiff(s2, s3);
    const diffs = [d01, d12, d23];
    const timeline = buildGovernanceTimeline({ genesis_snapshot: s0, diffs });
    const result = queryGovernanceAtTimestamp({
      genesis_snapshot: s0,
      timeline,
      diffs,
      timestamp: 4000,
    });

    assert.strictEqual(result.applied_diffs.length, 3);
    assert.strictEqual(result.applied_diffs[0], d01.diff_hash);
    assert.strictEqual(result.applied_diffs[1], d12.diff_hash);
    assert.strictEqual(result.applied_diffs[2], d23.diff_hash);
    assert.strictEqual(result.reconstructed_snapshot_hash, s3.global_hash);
  });

  it('Test 4 — Query between two diffs', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'd'.repeat(64), timestamp: 2000 });
    const s2 = cloneSnapshot(s1, { ledger_head_hash: 'e'.repeat(64), timestamp: 3000 });
    const d01 = computeGovernanceDiff(genesis, s1);
    const d12 = computeGovernanceDiff(s1, s2);
    const diffs = [d01, d12];
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs });
    const result = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs,
      timestamp: 2500,
    });

    assert.strictEqual(result.applied_diffs.length, 1);
    assert.strictEqual(result.applied_diffs[0], d01.diff_hash);
    assert.strictEqual(result.snapshot_hash_at_time, s1.global_hash);
  });

  it('Test 5 — Determinism', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'f'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const input = {
      genesis_snapshot: genesis,
      timeline,
      diffs: [diff] as const,
      timestamp: 2000,
    };

    const r1 = queryGovernanceAtTimestamp(input);
    const r2 = queryGovernanceAtTimestamp(input);

    assert.strictEqual(r1.query_hash, r2.query_hash);
    assert.strictEqual(r1.snapshot_hash_at_time, r2.snapshot_hash_at_time);
    assert.deepStrictEqual([...r1.applied_diffs], [...r2.applied_diffs]);
  });

  it('Test 6 — Verifier', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.6 }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'g'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const input = {
      genesis_snapshot: genesis,
      timeline,
      diffs: [diff],
      timestamp: 2000,
    };
    const result = queryGovernanceAtTimestamp(input);

    assert.strictEqual(verifyGovernanceHistoricalQuery(input, result), true);
  });

  it('Test 7 — Tampering detection', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'h'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const input = {
      genesis_snapshot: genesis,
      timeline,
      diffs: [diff],
      timestamp: 2000,
    };
    const result = queryGovernanceAtTimestamp(input);
    const tampered = { ...result, query_hash: '0'.repeat(64) };

    assert.strictEqual(verifyGovernanceHistoricalQuery(input, tampered), false);
  });
});
