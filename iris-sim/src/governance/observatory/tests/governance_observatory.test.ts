/**
 * Step 9F — Governance Observatory tests.
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
import { analyzeGovernanceIncident } from '../../incident_forensics/engine/governance_forensics_engine.js';
import { buildGovernanceObservatoryReport } from '../engine/governance_observatory_engine.js';
import { verifyGovernanceObservatoryReport } from '../verify/governance_observatory_verifier.js';

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

describe('Governance Observatory (9F)', () => {
  it('Test 1 — Observatory basic', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.75 }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [],
      forensic_reports: [],
    });

    assert.strictEqual(report.timeline_hash, timeline.timeline_hash);
    assert.strictEqual(report.total_events, 1);
    assert.strictEqual(report.observatory_events.length, 1);
    assert.strictEqual(report.observatory_events[0]!.event_type, 'snapshot');
    assert.ok(report.observatory_hash);
  });

  it('Test 2 — Timeline integration', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'a'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [],
      forensic_reports: [],
    });

    assert.strictEqual(report.total_events, 2);
    const snapshotEvents = report.observatory_events.filter((e) => e.event_type === 'snapshot');
    const diffEvents = report.observatory_events.filter((e) => e.event_type === 'diff');
    assert.strictEqual(snapshotEvents.length, 1);
    assert.strictEqual(diffEvents.length, 1);
    assert.strictEqual(diffEvents[0]!.event_hash, diff.diff_hash);
  });

  it('Test 3 — Compliance events', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE' }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const historical = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs: [],
      timestamp: 1000,
    });
    const compliance_report = evaluateGovernanceCompliance({
      query_result: historical,
      rules: DEFAULT_COMPLIANCE_RULES,
    });
    const report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [compliance_report],
      forensic_reports: [],
    });

    const complianceEvents = report.observatory_events.filter(
      (e) => e.event_type === 'compliance_check'
    );
    assert.strictEqual(complianceEvents.length, 1);
    assert.strictEqual(complianceEvents[0]!.event_hash, compliance_report.compliance_hash);
  });

  it('Test 4 — Incident events', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'b'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const historical = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs: [diff],
      timestamp: 2000,
    });
    const forensic_report = analyzeGovernanceIncident({
      incident_timestamp: 2000,
      timeline,
      historical_state: historical,
    });
    const report = buildGovernanceObservatoryReport({
      timeline,
      compliance_reports: [],
      forensic_reports: [forensic_report],
    });

    const incidentEvents = report.observatory_events.filter(
      (e) => e.event_type === 'incident_analysis'
    );
    assert.strictEqual(incidentEvents.length, 1);
    assert.strictEqual(incidentEvents[0]!.event_hash, forensic_report.forensic_hash);
  });

  it('Test 5 — Determinismo', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE' }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const input = {
      timeline,
      compliance_reports: [] as const,
      forensic_reports: [] as const,
    };

    const r1 = buildGovernanceObservatoryReport(input);
    const r2 = buildGovernanceObservatoryReport(input);

    assert.strictEqual(r1.observatory_hash, r2.observatory_hash);
    assert.strictEqual(r1.total_events, r2.total_events);
  });

  it('Test 6 — Tampering detection', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED' }), 1000);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [] });
    const input = { timeline, compliance_reports: [], forensic_reports: [] };
    const report = buildGovernanceObservatoryReport(input);
    const tampered = { ...report, observatory_hash: '0'.repeat(64) };

    assert.strictEqual(verifyGovernanceObservatoryReport(input, tampered), false);
  });
});
