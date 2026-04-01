/**
 * Step 9D — Governance Compliance Auditor tests.
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
import { evaluateGovernanceCompliance } from '../engine/governance_compliance_engine.js';
import { verifyGovernanceComplianceReport } from '../verify/governance_compliance_verifier.js';
import type { GovernanceComplianceContext } from '../types/governance_compliance_types.js';
import {
  DEFAULT_COMPLIANCE_RULES,
  RULE_SNAPSHOT_HASH_PRESENT,
  RULE_QUERY_HASH_VALID,
} from '../rules/governance_compliance_rules.js';

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

describe('Governance Compliance Auditor', () => {
  it('Test 1 — Compliance positiva', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.75 }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'a'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const query_result = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs: [diff],
      timestamp: 2000,
    });
    const report = evaluateGovernanceCompliance({
      query_result,
      rules: DEFAULT_COMPLIANCE_RULES,
    });

    assert.strictEqual(report.compliant, true);
    assert.strictEqual(report.checks.length, 3);
    assert.ok(report.checks.every((c) => c.passed));
    assert.strictEqual(report.snapshot_hash, query_result.reconstructed_snapshot_hash);
    assert.strictEqual(report.timestamp, query_result.query_timestamp);
    assert.ok(report.compliance_hash);
  });

  it('Test 2 — Rule failure', () => {
    const query_result = Object.freeze({
      query_timestamp: 1000,
      snapshot_hash_at_time: 'ab'.repeat(32),
      reconstructed_snapshot_hash: 'ab'.repeat(32),
      applied_diffs: [] as readonly string[],
      query_hash: '', // invalid: Rule 2 fails
    });
    const report = evaluateGovernanceCompliance({
      query_result,
      rules: DEFAULT_COMPLIANCE_RULES,
    });

    assert.strictEqual(report.compliant, false);
    const queryHashCheck = report.checks.find((c) => c.rule_id === 'query_hash_valid');
    assert.ok(queryHashCheck);
    assert.strictEqual(queryHashCheck!.passed, false);
  });

  it('Test 3 — Determinismo', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'b'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const query_result = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs: [diff],
      timestamp: 2000,
    });
    const input = { query_result, rules: DEFAULT_COMPLIANCE_RULES };

    const r1 = evaluateGovernanceCompliance(input);
    const r2 = evaluateGovernanceCompliance(input);

    assert.strictEqual(r1.compliance_hash, r2.compliance_hash);
    assert.strictEqual(r1.compliant, r2.compliant);
  });

  it('Test 4 — Verifier positivo', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_3_STABLE' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'c'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const query_result = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs: [diff],
      timestamp: 2000,
    });
    const input = { query_result, rules: DEFAULT_COMPLIANCE_RULES };
    const report = evaluateGovernanceCompliance(input);

    assert.strictEqual(verifyGovernanceComplianceReport(input, report), true);
  });

  it('Test 5 — Tampering detection', () => {
    const genesis = buildGlobalSnapshot(makeSnapshot({ tier: 'TIER_2_CONTROLLED' }), 1000);
    const s1 = cloneSnapshot(genesis, { certificate_hash: 'd'.repeat(64), timestamp: 2000 });
    const diff = computeGovernanceDiff(genesis, s1);
    const timeline = buildGovernanceTimeline({ genesis_snapshot: genesis, diffs: [diff] });
    const query_result = queryGovernanceAtTimestamp({
      genesis_snapshot: genesis,
      timeline,
      diffs: [diff],
      timestamp: 2000,
    });
    const input = { query_result, rules: DEFAULT_COMPLIANCE_RULES };
    const report = evaluateGovernanceCompliance(input);
    const tampered = { ...report, compliance_hash: '0'.repeat(64) };

    assert.strictEqual(verifyGovernanceComplianceReport(input, tampered), false);
  });

  it('Test 6 — Multiple rules', () => {
    const query_result = Object.freeze({
      query_timestamp: 1000,
      snapshot_hash_at_time: 'e'.repeat(64),
      reconstructed_snapshot_hash: 'e'.repeat(64),
      applied_diffs: [] as readonly string[],
      query_hash: 'f'.repeat(64),
    });
    const length64Rule = {
      rule_id: 'snapshot_hash_length_64',
      description: 'Snapshot hash is 64 chars',
      evaluate: (ctx: GovernanceComplianceContext) => ctx.snapshot_hash.length === 64,
    };
    const report = evaluateGovernanceCompliance({
      query_result,
      rules: [RULE_SNAPSHOT_HASH_PRESENT, RULE_QUERY_HASH_VALID, length64Rule],
    });

    assert.strictEqual(report.compliant, true);
    assert.strictEqual(report.checks.length, 3);
  });

});
