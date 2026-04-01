/**
 * Step 8I — Governance Certification Engine tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import { computeAdaptationSnapshot } from '../../self_adaptation/engine/self_adaptation_engine.js';
import { evaluateRuntimeAction } from '../../runtime_gate/engine/governance_runtime_gate.js';
import { buildGovernanceProof } from '../../cryptographic_proof/proof/governance_proof_builder.js';
import { buildGovernanceCertificate } from '../builder/governance_certificate_builder.js';
import { verifyGovernanceCertificate } from '../verify/governance_certificate_verifier.js';
import { exportGovernanceCertificate } from '../export/governance_certificate_export.js';

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

function buildFullPipeline() {
  const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
  const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
  const decision = evaluateRuntimeAction(
    { action: 'run', requestedFeatures: ['advanced_analysis'] },
    snapshot,
    emptyEnforcement
  );
  const proof = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
  return { snapshot, enforcement: emptyEnforcement, adaptation, decision, proof };
}

describe('Governance Certification Engine', () => {
  it('Test 1 — Certificate generation: certificate_id, final_certificate_hash, signature present', () => {
    const { snapshot, enforcement, adaptation, decision, proof } = buildFullPipeline();
    const cert = buildGovernanceCertificate(
      snapshot,
      enforcement,
      adaptation,
      decision,
      proof
    );
    assert.ok(cert.certificate_id);
    assert.ok(cert.final_certificate_hash);
    assert.ok(cert.signature);
    assert.strictEqual(cert.certificate_id.length, 64);
    assert.strictEqual(cert.final_certificate_hash.length, 64);
    assert.strictEqual(cert.signature.length, 64);
  });

  it('Test 2 — Verification success: same inputs → verifyGovernanceCertificate === true', () => {
    const { snapshot, enforcement, adaptation, decision, proof } = buildFullPipeline();
    const cert = buildGovernanceCertificate(
      snapshot,
      enforcement,
      adaptation,
      decision,
      proof
    );
    const ok = verifyGovernanceCertificate(
      cert,
      snapshot,
      enforcement,
      adaptation,
      decision,
      proof
    );
    assert.strictEqual(ok, true);
  });

  it('Test 3 — Runtime decision tampering: modify runtimeDecision.allowed → verify false', () => {
    const { snapshot, enforcement, adaptation, decision, proof } = buildFullPipeline();
    const cert = buildGovernanceCertificate(
      snapshot,
      enforcement,
      adaptation,
      decision,
      proof
    );
    const tamperedDecision = { ...decision, allowed: false };
    const ok = verifyGovernanceCertificate(
      cert,
      snapshot,
      enforcement,
      adaptation,
      tamperedDecision,
      proof
    );
    assert.strictEqual(ok, false);
  });

  it('Test 4 — Governance snapshot tampering: modify governanceSnapshot.tier → verify false', () => {
    const { snapshot, enforcement, adaptation, decision, proof } = buildFullPipeline();
    const cert = buildGovernanceCertificate(
      snapshot,
      enforcement,
      adaptation,
      decision,
      proof
    );
    const tamperedSnapshot = makeSnapshot({ tier: 'TIER_4_ENTERPRISE_READY' });
    const ok = verifyGovernanceCertificate(
      cert,
      tamperedSnapshot,
      enforcement,
      adaptation,
      decision,
      proof
    );
    assert.strictEqual(ok, false);
  });

  it('Test 5 — Determinism: same inputs → identical final_certificate_hash and certificate_id', () => {
    const { snapshot, enforcement, adaptation, decision, proof } = buildFullPipeline();
    const a = buildGovernanceCertificate(
      snapshot,
      enforcement,
      adaptation,
      decision,
      proof
    );
    const b = buildGovernanceCertificate(
      snapshot,
      enforcement,
      adaptation,
      decision,
      proof
    );
    assert.strictEqual(a.final_certificate_hash, b.final_certificate_hash);
    assert.strictEqual(a.certificate_id, b.certificate_id);
  });

  it('Export is JSON-serializable', () => {
    const { snapshot, enforcement, adaptation, decision, proof } = buildFullPipeline();
    const exported = exportGovernanceCertificate(
      snapshot,
      enforcement,
      adaptation,
      decision,
      proof
    );
    const json = JSON.stringify(exported);
    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.certificate.certificate_id, exported.certificate.certificate_id);
  });
});
