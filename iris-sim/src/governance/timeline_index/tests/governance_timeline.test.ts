/**
 * Step 9B — Governance Timeline Index tests.
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
import { buildGovernanceTimeline } from '../builder/governance_timeline_builder.js';
import {
  getTimelineEventsUntil,
  getTimelineEventsBetween,
  getLastEventBefore,
} from '../query/governance_timeline_query.js';
import { verifyGovernanceTimeline } from '../verify/governance_timeline_verifier.js';

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

describe('Governance Timeline Index', () => {
  it('Test 1 — Timeline with only genesis snapshot', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.75 }));
    const timeline = buildGovernanceTimeline({
      genesis_snapshot: genesis,
      diffs: [],
    });

    assert.strictEqual(timeline.events.length, 1);
    assert.strictEqual(timeline.events[0]!.type, 'snapshot');
    assert.strictEqual(timeline.events[0]!.hash, genesis.global_hash);
    assert.strictEqual(timeline.genesis_snapshot_hash, genesis.global_hash);
    assert.ok(timeline.timeline_hash);
  });

  it('Test 2 — Timeline with diff', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.6 }));
    const next = cloneSnapshot(genesis, { certificate_hash: 'a'.repeat(64) });
    const diff = computeGovernanceDiff(genesis, next);
    const timeline = buildGovernanceTimeline({
      genesis_snapshot: genesis,
      diffs: [diff],
    });

    assert.strictEqual(timeline.events.length, 2);
    assert.strictEqual(timeline.events[0]!.type, 'snapshot');
    assert.strictEqual(timeline.events[1]!.type, 'diff');
    assert.strictEqual(timeline.events[1]!.hash, diff.diff_hash);
    const sorted = [...timeline.events].sort((a, b) => a.timestamp - b.timestamp);
    assert.deepStrictEqual(timeline.events, sorted);
  });

  it('Test 3 — Timestamp ordering', () => {
    const s0 = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_1_RESTRICTED' }), 100);
    const s1 = cloneSnapshot(s0, { certificate_hash: 'b'.repeat(64), timestamp: 200 });
    const s2 = cloneSnapshot(s1, { ledger_head_hash: 'c'.repeat(64), timestamp: 300 });
    const diff01 = computeGovernanceDiff(s0, s1);
    const diff12 = computeGovernanceDiff(s1, s2);
    // Pass diffs in wrong order: later (300) first, then earlier (200)
    const timeline = buildGovernanceTimeline({
      genesis_snapshot: s0,
      diffs: [diff12, diff01],
    });

    for (let i = 1; i < timeline.events.length; i++) {
      assert.ok(
        timeline.events[i]!.timestamp >= timeline.events[i - 1]!.timestamp,
        'events must be sorted by timestamp'
      );
    }
  });

  it('Test 4 — Determinism', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.6 }));
    const next = cloneSnapshot(genesis, { certificate_hash: 'd'.repeat(64) });
    const diff = computeGovernanceDiff(genesis, next);
    const input = { genesis_snapshot: genesis, diffs: [diff] as const };

    const t1 = buildGovernanceTimeline(input);
    const t2 = buildGovernanceTimeline(input);

    assert.strictEqual(t1.timeline_hash, t2.timeline_hash);
    assert.strictEqual(t1.genesis_snapshot_hash, t2.genesis_snapshot_hash);
    assert.strictEqual(t1.events.length, t2.events.length);
  });

  it('Test 5 — Query until timestamp', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'e'.repeat(64), timestamp: 2000 });
    const s2 = cloneSnapshot(s1, { ledger_head_hash: 'f'.repeat(64), timestamp: 3000 });
    const d1 = computeGovernanceDiff(genesis, s1);
    const d2 = computeGovernanceDiff(s1, s2);
    const timeline = buildGovernanceTimeline({
      genesis_snapshot: genesis,
      diffs: [d1, d2],
    });

    const until2500 = getTimelineEventsUntil(timeline, 2500);
    assert.strictEqual(until2500.length, 2); // genesis (1000) + first diff (2000)
    assert.strictEqual(until2500[0]!.type, 'snapshot');
    assert.strictEqual(until2500[1]!.type, 'diff');

    const until500 = getTimelineEventsUntil(timeline, 500);
    assert.strictEqual(until500.length, 0);
  });

  it('Test 6 — Query range', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'g'.repeat(64), timestamp: 2000 });
    const s2 = cloneSnapshot(s1, { watcher_state_hash: 'h'.repeat(64), timestamp: 3000 });
    const d1 = computeGovernanceDiff(genesis, s1);
    const d2 = computeGovernanceDiff(s1, s2);
    const timeline = buildGovernanceTimeline({
      genesis_snapshot: genesis,
      diffs: [d1, d2],
    });

    const between = getTimelineEventsBetween(timeline, 1500, 2500);
    assert.strictEqual(between.length, 1);
    assert.strictEqual(between[0]!.type, 'diff');
    assert.strictEqual(between[0]!.timestamp, 2000);

    const lastBefore = getLastEventBefore(timeline, 2000);
    assert.ok(lastBefore);
    assert.strictEqual(lastBefore!.type, 'snapshot');
    assert.strictEqual(lastBefore!.timestamp, 1000);
  });

  it('Test 7 — Verifier', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.75 }));
    const next = cloneSnapshot(genesis, { certificate_hash: 'i'.repeat(64) });
    const diff = computeGovernanceDiff(genesis, next);
    const timeline = buildGovernanceTimeline({
      genesis_snapshot: genesis,
      diffs: [diff],
    });

    assert.strictEqual(verifyGovernanceTimeline(timeline), true);

    const tampered = { ...timeline, timeline_hash: '0'.repeat(64) };
    assert.strictEqual(verifyGovernanceTimeline(tampered), false);
  });
});
