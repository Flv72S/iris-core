/**
 * Step 8L — Governance Watcher tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import { createLedger, appendAttestation } from '../../ledger/chain/ledger_chain.js';
import { buildGovernanceAttestation } from '../../attestation/builder/attestation_builder.js';
import { computeAdaptationSnapshot } from '../../self_adaptation/engine/self_adaptation_engine.js';
import { evaluateRuntimeAction } from '../../runtime_gate/engine/governance_runtime_gate.js';
import { buildGovernanceProof } from '../../cryptographic_proof/proof/governance_proof_builder.js';
import { runGovernanceCheck } from '../watcher/governance_watcher.js';
import { detectPolicyViolations } from '../detection/policy_violation_detector.js';
import { detectGovernanceDrift } from '../detection/governance_drift_detector.js';
import { detectLedgerIntegrityIssues } from '../detection/ledger_integrity_detector.js';
import { detectSuspiciousEvents } from '../detection/suspicious_event_detector.js';

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

describe('Governance Watcher Tests', () => {
  it('Policy violation detected', () => {
    const enforcement: PolicyEnforcementResult = Object.freeze({
      blockedFeatures: ['autonomous_decision'],
      allowedFeatures: [],
    });
    const decision = Object.freeze({
      allowed: true,
      autonomyLevel: 'SUPERVISED',
      allowedFeatures: ['autonomous_decision', 'basic_analysis'],
      auditMultiplier: 1.2,
      safetyConstraintLevel: 0.4,
    });
    const alerts = detectPolicyViolations(enforcement, decision);
    assert.ok(alerts.length >= 1);
    assert.strictEqual(alerts[0]!.type, 'POLICY_VIOLATION');
    assert.strictEqual(alerts[0]!.severity, 'HIGH');
  });

  it('Governance drift detected', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
    const wrongCertifiedHash = '0'.repeat(64);
    const alerts = detectGovernanceDrift(snapshot, wrongCertifiedHash);
    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0]!.type, 'GOVERNANCE_DRIFT');
    assert.strictEqual(alerts[0]!.severity, 'CRITICAL');
  });

  it('Ledger integrity detected', () => {
    const ledger = createLedger();
    const snapshot = makeSnapshot({ tier: 'TIER_2_CONTROLLED' });
    const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
    const decision = evaluateRuntimeAction({ action: 'run' }, snapshot, emptyEnforcement);
    const proof = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
    appendAttestation(ledger, buildGovernanceAttestation(proof, adaptation, decision));
    const tampered = {
      entries: ledger.entries.map((e, i) => (i === 0 ? { ...e, attestation_hash: '0'.repeat(64) } : e)),
    };
    const alerts = detectLedgerIntegrityIssues(tampered);
    assert.ok(alerts.length >= 1);
    assert.strictEqual(alerts[0]!.type, 'LEDGER_INTEGRITY_FAILURE');
  });

  it('Suspicious event detected', () => {
    const now = Date.now();
    const events = [
      Object.freeze({ type: 'policy_change', timestamp: now }),
      Object.freeze({ type: 'runtime_decision', timestamp: now + 2000 }),
    ];
    const alerts = detectSuspiciousEvents(events);
    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0]!.type, 'SUSPICIOUS_ACTIVITY');
    assert.strictEqual(alerts[0]!.severity, 'MEDIUM');
  });

  it('No anomalies detected', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
    const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
    const decision = evaluateRuntimeAction(
      { action: 'run', requestedFeatures: ['advanced_analysis'] },
      snapshot,
      emptyEnforcement
    );
    const ledger = createLedger();
    appendAttestation(ledger, buildGovernanceAttestation(
      buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision),
      adaptation,
      decision
    ));
    const certifiedHash = hashObjectDeterministic(snapshot);
    const alerts = runGovernanceCheck({
      governanceSnapshot: snapshot,
      policyEnforcement: emptyEnforcement,
      runtimeDecision: decision,
      certifiedSnapshotHash: certifiedHash,
      ledger,
    });
    assert.strictEqual(alerts.length, 0);
  });
});
