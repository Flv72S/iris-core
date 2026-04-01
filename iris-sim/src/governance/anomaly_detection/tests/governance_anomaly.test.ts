/**
 * Step 9H — Governance Anomaly Detection Engine tests.
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
import { buildGovernanceTimeline } from '../../timeline_index/builder/governance_timeline_builder.js';
import { buildGovernanceObservatoryReport } from '../../observatory/engine/governance_observatory_engine.js';
import { generateGovernanceTelemetry } from '../../telemetry/engine/governance_telemetry_engine.js';
import { detectGovernanceAnomalies } from '../engine/governance_anomaly_engine.js';
import { verifyGovernanceAnomalyReport } from '../verify/governance_anomaly_verifier.js';

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

describe('Governance Anomaly Detection Engine', () => {
  it('Test 1 — Anomaly detection basic', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.75 }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const observatory_report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [],
      forensic_reports: [],
    });
    const telemetry_report = generateGovernanceTelemetry({ observatory_report });
    const report = detectGovernanceAnomalies({ telemetry_report });

    assert.strictEqual(report.source_telemetry_hash, telemetry_report.telemetry_hash);
    assert.ok(Array.isArray(report.anomalies));
    assert.ok(typeof report.anomaly_detected === 'boolean');
    assert.ok(report.anomaly_hash);
  });

  it('Test 2 — Diff anomaly', () => {
    const telemetry_report = Object.freeze({
      source_observatory_hash: 'a'.repeat(64),
      metrics: Object.freeze({
        total_events: 20,
        snapshot_events: 2,
        diff_events: 15,
        compliance_events: 2,
        incident_events: 1,
      }),
      telemetry_hash: 'b'.repeat(64),
    });
    const report = detectGovernanceAnomalies({ telemetry_report });

    assert.strictEqual(report.anomaly_detected, true);
    const diffAnomaly = report.anomalies.find((a) => a.anomaly_id === 'excessive_diff_events');
    assert.ok(diffAnomaly);
    assert.strictEqual(diffAnomaly!.severity, 'high');
  });

  it('Test 3 — Incident anomaly', () => {
    const telemetry_report = Object.freeze({
      source_observatory_hash: 'c'.repeat(64),
      metrics: Object.freeze({
        total_events: 20,
        snapshot_events: 5,
        diff_events: 4,
        compliance_events: 0,
        incident_events: 11,
      }),
      telemetry_hash: 'd'.repeat(64),
    });
    const report = detectGovernanceAnomalies({ telemetry_report });

    assert.strictEqual(report.anomaly_detected, true);
    const incidentAnomaly = report.anomalies.find(
      (a) => a.anomaly_id === 'excessive_incident_events'
    );
    assert.ok(incidentAnomaly);
    assert.strictEqual(incidentAnomaly!.severity, 'medium');
  });

  it('Test 4 — No anomaly scenario', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED' }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const observatory_report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [],
      forensic_reports: [],
    });
    const telemetry_report = generateGovernanceTelemetry({ observatory_report });
    const report = detectGovernanceAnomalies({ telemetry_report });

    assert.strictEqual(report.anomaly_detected, false);
    assert.strictEqual(report.anomalies.length, 0);
  });

  it('Test 5 — Determinismo', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE' }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const observatory_report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [],
      forensic_reports: [],
    });
    const telemetry_report = generateGovernanceTelemetry({ observatory_report });
    const input = { telemetry_report };

    const r1 = detectGovernanceAnomalies(input);
    const r2 = detectGovernanceAnomalies(input);

    assert.strictEqual(r1.anomaly_hash, r2.anomaly_hash);
    assert.strictEqual(r1.anomaly_detected, r2.anomaly_detected);
  });

  it('Test 6 — Verifier positivo', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.6 }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const observatory_report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [],
      forensic_reports: [],
    });
    const telemetry_report = generateGovernanceTelemetry({ observatory_report });
    const input = { telemetry_report };
    const report = detectGovernanceAnomalies(input);

    assert.strictEqual(verifyGovernanceAnomalyReport(input, report), true);
  });

  it('Test 7 — Tampering detection', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE' }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const observatory_report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [],
      forensic_reports: [],
    });
    const telemetry_report = generateGovernanceTelemetry({ observatory_report });
    const input = { telemetry_report };
    const report = detectGovernanceAnomalies(input);
    const tampered = { ...report, anomaly_hash: '0'.repeat(64) };

    assert.strictEqual(verifyGovernanceAnomalyReport(input, tampered), false);
  });
});
