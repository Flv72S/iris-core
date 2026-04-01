/**
 * Step 9A — Governance Replay Engine tests.
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
import { replayGovernanceHistory } from '../engine/governance_replay_engine.js';
import { verifyGovernanceReplay } from '../verify/governance_replay_verifier.js';

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

function buildGlobalSnapshot(snapshot: GovernanceTierSnapshot): GlobalGovernanceSnapshot {
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

  return buildGlobalGovernanceSnapshot(
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
}

function cloneSnapshot(
  snapshot: GlobalGovernanceSnapshot,
  overrides: Partial<GlobalGovernanceSnapshot>
): GlobalGovernanceSnapshot {
  const next = {
    ...snapshot,
    ...overrides,
  };
  const global_hash = computeGlobalSnapshotHash(next);
  return Object.freeze({
    ...next,
    snapshot_id: sha256Hex(global_hash),
    global_hash,
  });
}

describe('Governance Replay Engine', () => {
  it('Test 1 — Replay without diff', () => {
    const base = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.75 }));
    const result = replayGovernanceHistory({
      base_snapshot: base,
      diffs: [],
    });

    assert.strictEqual(result.initial_snapshot_hash, base.global_hash);
    assert.strictEqual(result.final_snapshot_hash, base.global_hash);
    assert.strictEqual(result.steps.length, 0);
    assert.ok(result.replay_hash);
  });

  it('Test 2 — Replay with 1 diff', () => {
    const snapshotA = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.6 }));
    const snapshotB = cloneSnapshot(snapshotA, { certificate_hash: 'a'.repeat(64) });
    const diff = computeGovernanceDiff(snapshotA, snapshotB);

    const result = replayGovernanceHistory({
      base_snapshot: snapshotA,
      diffs: [diff],
    });

    assert.strictEqual(result.initial_snapshot_hash, snapshotA.global_hash);
    assert.strictEqual(result.final_snapshot_hash, snapshotB.global_hash);
    assert.notStrictEqual(result.final_snapshot_hash, result.initial_snapshot_hash);
    assert.strictEqual(result.steps.length, 1);
    assert.strictEqual(result.steps[0]!.applied_diff_hash, diff.diff_hash);
    assert.strictEqual(result.steps[0]!.resulting_snapshot_hash, snapshotB.global_hash);
  });

  it('Test 3 — Replay with multiple diffs', () => {
    const s0 = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_1_RESTRICTED', score: 0.4 }));
    const s1 = cloneSnapshot(s0, { certificate_hash: 'b'.repeat(64) });
    const s2 = cloneSnapshot(s1, { ledger_head_hash: 'c'.repeat(64) });
    const s3 = cloneSnapshot(s2, { governance_tier: 'TIER_3_STABLE' });

    const diff01 = computeGovernanceDiff(s0, s1);
    const diff12 = computeGovernanceDiff(s1, s2);
    const diff23 = computeGovernanceDiff(s2, s3);

    const result = replayGovernanceHistory({
      base_snapshot: s0,
      diffs: [diff01, diff12, diff23],
    });

    assert.strictEqual(result.initial_snapshot_hash, s0.global_hash);
    assert.strictEqual(result.final_snapshot_hash, s3.global_hash);
    assert.strictEqual(result.steps.length, 3);
    assert.strictEqual(result.steps[0]!.resulting_snapshot_hash, s1.global_hash);
    assert.strictEqual(result.steps[1]!.resulting_snapshot_hash, s2.global_hash);
    assert.strictEqual(result.steps[2]!.resulting_snapshot_hash, s3.global_hash);

    const result2 = replayGovernanceHistory({
      base_snapshot: s0,
      diffs: [diff01, diff12, diff23],
    });
    assert.strictEqual(result.final_snapshot_hash, result2.final_snapshot_hash);
    assert.strictEqual(result.replay_hash, result2.replay_hash);
  });

  it('Test 4 — Determinism', () => {
    const base = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.6 }));
    const next = cloneSnapshot(base, { certificate_hash: 'd'.repeat(64) });
    const diff = computeGovernanceDiff(base, next);
    const input = { base_snapshot: base, diffs: [diff] as const };

    const first = replayGovernanceHistory(input);
    const second = replayGovernanceHistory(input);

    assert.strictEqual(first.replay_hash, second.replay_hash);
    assert.strictEqual(first.initial_snapshot_hash, second.initial_snapshot_hash);
    assert.strictEqual(first.final_snapshot_hash, second.final_snapshot_hash);
    assert.strictEqual(first.steps.length, second.steps.length);
  });

  it('Test 5 — Verifier', () => {
    const base = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.75 }));
    const next = cloneSnapshot(base, { watcher_state_hash: 'e'.repeat(64) });
    const diff = computeGovernanceDiff(base, next);
    const input = { base_snapshot: base, diffs: [diff] };
    const result = replayGovernanceHistory(input);

    assert.strictEqual(verifyGovernanceReplay(input, result), true);
  });

  it('Test 6 — Tampering detection', () => {
    const base = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.6 }));
    const next = cloneSnapshot(base, { certificate_hash: 'f'.repeat(64) });
    const diff = computeGovernanceDiff(base, next);
    const input = { base_snapshot: base, diffs: [diff] };
    const result = replayGovernanceHistory(input);
    const tampered = { ...result, replay_hash: '0'.repeat(64) };

    assert.strictEqual(verifyGovernanceReplay(input, tampered), false);
  });
});
