/**
 * Step 9E — Governance Incident Forensics Engine tests.
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
import { queryGovernanceAtTimestamp } from '../../historical_query/engine/governance_historical_query_engine.js';
import { analyzeGovernanceIncident } from '../engine/governance_forensics_engine.js';
import { verifyGovernanceForensicReport } from '../verify/governance_forensics_verifier.js';

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

describe('Governance Incident Forensics Engine', () => {
  it('Test 1 — Incident analysis basic', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.75 }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'a'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const historical_state = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs: [diff],
      timestamp: 2000,
    });
    const input: Parameters<typeof analyzeGovernanceIncident>[0] = {
      incident_timestamp: 2000,
      timeline,
      historical_state,
    };
    const report = analyzeGovernanceIncident(input);

    assert.strictEqual(report.incident_timestamp, 2000);
    assert.strictEqual(report.snapshot_hash_at_incident, historical_state.reconstructed_snapshot_hash);
    assert.ok(Array.isArray(report.related_events));
    assert.ok(report.forensic_hash);
    assert.strictEqual(report.related_events.length, 2); // genesis snapshot + 1 diff
  });

  it('Test 2 — Event extraction', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'b'.repeat(64), timestamp: 2000 });
    const s2 = cloneSnapshot(s1, { ledger_head_hash: 'c'.repeat(64), timestamp: 3000 });
    const d01 = computeGovernanceDiff(genesis, s1);
    const d12 = computeGovernanceDiff(s1, s2);
    const diffs = [d01, d12];
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs });
    const historical_state = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs,
      timestamp: 2500,
    });
    const report = analyzeGovernanceIncident({
      incident_timestamp: 2500,
      timeline,
      historical_state,
    });

    assert.strictEqual(report.related_events.length, 2); // genesis (1000) + first diff (2000)
    const snapshotEvents = report.related_events.filter((e) => e.event_type === 'snapshot');
    const diffEvents = report.related_events.filter((e) => e.event_type === 'diff');
    assert.strictEqual(snapshotEvents.length, 1);
    assert.strictEqual(diffEvents.length, 1);
    assert.strictEqual(report.snapshot_hash_at_incident, s1.global_hash);
  });

  it('Test 3 — Determinismo', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'd'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const historical_state = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs: [diff],
      timestamp: 2000,
    });
    const input = { incident_timestamp: 2000, timeline, historical_state };

    const r1 = analyzeGovernanceIncident(input);
    const r2 = analyzeGovernanceIncident(input);

    assert.strictEqual(r1.forensic_hash, r2.forensic_hash);
    assert.strictEqual(r1.related_events.length, r2.related_events.length);
  });

  it('Test 4 — Verifier positivo', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.6 }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'e'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const historical_state = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs: [diff],
      timestamp: 2000,
    });
    const input = { incident_timestamp: 2000, timeline, historical_state };
    const report = analyzeGovernanceIncident(input);

    assert.strictEqual(verifyGovernanceForensicReport(input, report), true);
  });

  it('Test 5 — Tampering detection', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'f'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const historical_state = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs: [diff],
      timestamp: 2000,
    });
    const input = { incident_timestamp: 2000, timeline, historical_state };
    const report = analyzeGovernanceIncident(input);
    const tampered = { ...report, forensic_hash: '0'.repeat(64) };

    assert.strictEqual(verifyGovernanceForensicReport(input, tampered), false);
  });

  it('Test 6 — Event ordering', () => {
    const s0 = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_1_RESTRICTED' }), 1000);
    const s1 = cloneSnapshot(s0, { certificate_hash: 'g'.repeat(64), timestamp: 3000 });
    const s2 = cloneSnapshot(s1, { ledger_head_hash: 'h'.repeat(64), timestamp: 2000 });
    const d01 = computeGovernanceDiff(s0, s1);
    const d12 = computeGovernanceDiff(s1, s2);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: s0, diffs: [d01, d12] });
    const historical_state = queryGovernanceAtTimestamp({
      genesis_snapshot: s0,
      timeline,
      diffs: [d01, d12],
      timestamp: 3500,
    });
    const report = analyzeGovernanceIncident({
      incident_timestamp: 3500,
      timeline,
      historical_state,
    });

    for (let i = 1; i < report.related_events.length; i++) {
      assert.ok(
        report.related_events[i]!.timestamp >= report.related_events[i - 1]!.timestamp,
        'related_events must be ordered by timestamp'
      );
    }
  });
});
