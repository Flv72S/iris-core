/**
 * Step 8F — Governance Attestation Layer tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import { computeAdaptationSnapshot } from '../../self_adaptation/engine/self_adaptation_engine.js';
import { evaluateRuntimeAction } from '../../runtime_gate/engine/governance_runtime_gate.js';
import { buildGovernanceProof } from '../../cryptographic_proof/proof/governance_proof_builder.js';
import { buildGovernanceAttestation } from '../builder/attestation_builder.js';
import { verifyGovernanceAttestation } from '../verifier/attestation_verifier.js';
import { serializeAttestation } from '../serializer/attestation_serializer.js';

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

describe('Governance Attestation', () => {
  it('Test 1 — Attestation generation: attestation_id, attestation_hash, proof present', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
    const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
    const decision = evaluateRuntimeAction(
      { action: 'run', requestedFeatures: ['advanced_analysis'] },
      snapshot,
      emptyEnforcement
    );
    const proof = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
    const attestation = buildGovernanceAttestation(proof, adaptation, decision);
    assert.ok(attestation.attestation_id);
    assert.ok(attestation.attestation_hash);
    assert.ok(attestation.proof);
    assert.strictEqual(attestation.attestation_id.length, 64);
    assert.strictEqual(attestation.attestation_hash.length, 64);
  });

  it('Test 2 — Attestation verification: verifyGovernanceAttestation === true', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
    const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
    const decision = evaluateRuntimeAction(
      { action: 'run', requestedFeatures: ['advanced_analysis'] },
      snapshot,
      emptyEnforcement
    );
    const proof = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
    const attestation = buildGovernanceAttestation(proof, adaptation, decision);
    const ok = verifyGovernanceAttestation(
      attestation,
      snapshot,
      emptyEnforcement,
      adaptation,
      decision
    );
    assert.strictEqual(ok, true);
  });

  it('Test 3 — Proof tampering detection: modified proof.final_proof_hash → verify false', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
    const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
    const decision = evaluateRuntimeAction(
      { action: 'run', requestedFeatures: ['advanced_analysis'] },
      snapshot,
      emptyEnforcement
    );
    const proof = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
    const attestation = buildGovernanceAttestation(proof, adaptation, decision);
    const tamperedProof = { ...proof, final_proof_hash: '0'.repeat(64) };
    const tamperedAttestation = { ...attestation, proof: tamperedProof };
    const ok = verifyGovernanceAttestation(
      tamperedAttestation,
      snapshot,
      emptyEnforcement,
      adaptation,
      decision
    );
    assert.strictEqual(ok, false);
  });

  it('Test 4 — Decision tampering detection: modified decision_allowed → verify fails', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
    const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
    const decision = evaluateRuntimeAction(
      { action: 'run', requestedFeatures: ['advanced_analysis'] },
      snapshot,
      emptyEnforcement
    );
    const proof = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
    const attestation = buildGovernanceAttestation(proof, adaptation, decision);
    const tamperedAttestation = {
      ...attestation,
      decision_allowed: !attestation.decision_allowed,
    };
    const ok = verifyGovernanceAttestation(
      tamperedAttestation,
      snapshot,
      emptyEnforcement,
      adaptation,
      decision
    );
    assert.strictEqual(ok, false);
  });

  it('Test 5 — Determinism: same input → same attestation_hash', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.65 });
    const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
    const decision = evaluateRuntimeAction({ action: 'run' }, snapshot, emptyEnforcement);
    const proof = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
    const a = buildGovernanceAttestation(proof, adaptation, decision);
    const b = buildGovernanceAttestation(proof, adaptation, decision);
    assert.strictEqual(a.attestation_hash, b.attestation_hash);
  });

  it('Serializer produces valid JSON', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
    const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
    const decision = evaluateRuntimeAction({ action: 'run' }, snapshot, emptyEnforcement);
    const proof = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
    const attestation = buildGovernanceAttestation(proof, adaptation, decision);
    const json = serializeAttestation(attestation);
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.attestation_id, attestation.attestation_id);
    assert.strictEqual(parsed.decision_allowed, attestation.decision_allowed);
  });
});
