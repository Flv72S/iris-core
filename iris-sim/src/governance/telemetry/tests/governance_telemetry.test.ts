/**
 * Step 9G — Governance Telemetry Engine tests.
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
import { evaluateGovernanceCompliance } from '../../compliance_auditor/engine/governance_compliance_engine.js';
import { DEFAULT_COMPLIANCE_RULES } from '../../compliance_auditor/rules/governance_compliance_rules.js';
import { buildGovernanceObservatoryReport } from '../../observatory/engine/governance_observatory_engine.js';
import { generateGovernanceTelemetry } from '../engine/governance_telemetry_engine.js';
import { calculateGovernanceMetrics } from '../metrics/governance_metrics_calculator.js';
import { verifyGovernanceTelemetry } from '../verify/governance_telemetry_verifier.js';

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

describe('Governance Telemetry Engine', () => {
  it('Test 1 — Telemetry generation', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.75 }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const observatory_report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [],
      forensic_reports: [],
    });
    const report = generateGovernanceTelemetry({ observatory_report });

    assert.strictEqual(report.source_observatory_hash, observatory_report.observatory_hash);
    assert.ok(report.telemetry_hash);
    assert.strictEqual(report.metrics.total_events, 1);
  });

  it('Test 2 — Metrics calculation', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'a'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const historical = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs: [diff],
      timestamp: 2000,
    });
    const compliance_report = evaluateGovernanceCompliance({
      query_result: historical,
      rules: DEFAULT_COMPLIANCE_RULES,
    });
    const observatory_report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [compliance_report],
      forensic_reports: [],
    });
    const report = generateGovernanceTelemetry({ observatory_report });

    assert.strictEqual(report.metrics.total_events, 3); // 1 snapshot + 1 diff + 1 compliance
    assert.strictEqual(
      report.metrics.snapshot_events + report.metrics.diff_events + report.metrics.compliance_events + report.metrics.incident_events,
      report.metrics.total_events
    );
  });

  it('Test 3 — Snapshot metrics', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE' }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const observatory_report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [],
      forensic_reports: [],
    });
    const metrics = calculateGovernanceMetrics(observatory_report);

    assert.strictEqual(metrics.snapshot_events, 1);
    assert.strictEqual(metrics.diff_events, 0);
    assert.strictEqual(metrics.total_events, 1);
  });

  it('Test 4 — Diff metrics', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'b'.repeat(64), timestamp: 2000 });
    const s2 = cloneSnapshot(s1, { ledger_head_hash: 'c'.repeat(64), timestamp: 3000 });
    const d01 = computeGovernanceDiff(genesis, s1);
    const d12 = computeGovernanceDiff(s1, s2);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [d01, d12] });
    const observatory_report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [],
      forensic_reports: [],
    });
    const metrics = calculateGovernanceMetrics(observatory_report);

    assert.strictEqual(metrics.snapshot_events, 1);
    assert.strictEqual(metrics.diff_events, 2);
    assert.strictEqual(metrics.total_events, 3);
  });

  it('Test 5 — Determinismo', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE' }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const observatory_report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [],
      forensic_reports: [],
    });
    const input = { observatory_report };

    const r1 = generateGovernanceTelemetry(input);
    const r2 = generateGovernanceTelemetry(input);

    assert.strictEqual(r1.telemetry_hash, r2.telemetry_hash);
    assert.strictEqual(r1.metrics.total_events, r2.metrics.total_events);
  });

  it('Test 6 — Verifier positivo', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.6 }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const observatory_report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [],
      forensic_reports: [],
    });
    const input = { observatory_report };
    const report = generateGovernanceTelemetry(input);

    assert.strictEqual(verifyGovernanceTelemetry(input, report), true);
  });

  it('Test 7 — Tampering detection', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE' }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const observatory_report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [],
      forensic_reports: [],
    });
    const input = { observatory_report };
    const report = generateGovernanceTelemetry(input);
    const tampered = { ...report, telemetry_hash: '0'.repeat(64) };

    assert.strictEqual(verifyGovernanceTelemetry(input, tampered), false);
  });
});
