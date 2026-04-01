/**
 * Step 8E — Governance Cryptographic Proof tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import { computeAdaptationSnapshot } from '../../self_adaptation/engine/self_adaptation_engine.js';
import { evaluateRuntimeAction } from '../../runtime_gate/engine/governance_runtime_gate.js';
import { buildGovernanceProof } from '../proof/governance_proof_builder.js';
import { verifyGovernanceProof } from '../verify/governance_proof_verifier.js';

function makeSnapshot(overrides: {
  tier?: GovernanceTierSnapshot['tier'];
  score?: number;
  computedAt?: number;
}): GovernanceTierSnapshot {
  return Object.freeze({
    modelVersion: '7A_v1.0',
    score: overrides.score ?? 0.5,
    tier: overrides.tier ?? 'TIER_2_CONTROLLED',
    computedAt: overrides.computedAt ?? 1000,
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

describe('Governance Cryptographic Proof', () => {
  it('Test 1 — Proof generation: proof_id and final_proof_hash present', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
    const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
    const decision = evaluateRuntimeAction(
      { action: 'run', requestedFeatures: ['advanced_analysis'] },
      snapshot,
      emptyEnforcement
    );
    const proof = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
    assert.ok(proof.proof_id);
    assert.ok(proof.final_proof_hash);
    assert.strictEqual(proof.proof_id.length, 64);
    assert.strictEqual(proof.final_proof_hash.length, 64);
  });

  it('Test 2 — Proof verification: verifyGovernanceProof === true', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
    const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
    const decision = evaluateRuntimeAction(
      { action: 'run', requestedFeatures: ['advanced_analysis'] },
      snapshot,
      emptyEnforcement
    );
    const proof = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
    const ok = verifyGovernanceProof(proof, snapshot, emptyEnforcement, adaptation, decision);
    assert.strictEqual(ok, true);
  });

  it('Test 3 — Tampering detection: modified runtimeDecision.allowed → verify false', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
    const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
    const decision = evaluateRuntimeAction(
      { action: 'run', requestedFeatures: ['advanced_analysis'] },
      snapshot,
      emptyEnforcement
    );
    const proof = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
    const tamperedDecision = { ...decision, allowed: false };
    const ok = verifyGovernanceProof(
      proof,
      snapshot,
      emptyEnforcement,
      adaptation,
      tamperedDecision
    );
    assert.strictEqual(ok, false);
  });

  it('Test 4 — Determinism: same input → same final_proof_hash', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.65 });
    const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
    const decision = evaluateRuntimeAction({ action: 'run' }, snapshot, emptyEnforcement);
    const proof1 = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
    const proof2 = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
    assert.strictEqual(proof1.final_proof_hash, proof2.final_proof_hash);
  });

  it('Test 5 — Snapshot integrity: modified governanceSnapshot.tier → verify fails', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
    const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
    const decision = evaluateRuntimeAction({ action: 'run' }, snapshot, emptyEnforcement);
    const proof = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
    const tamperedSnapshot = makeSnapshot({ tier: 'TIER_4_ENTERPRISE_READY' });
    const ok = verifyGovernanceProof(
      proof,
      tamperedSnapshot,
      emptyEnforcement,
      adaptation,
      decision
    );
    assert.strictEqual(ok, false);
  });
});
