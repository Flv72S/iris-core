/**
 * Step 8K — Governance External Verifier tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import { computeAdaptationSnapshot } from '../../self_adaptation/engine/self_adaptation_engine.js';
import { evaluateRuntimeAction } from '../../runtime_gate/engine/governance_runtime_gate.js';
import { buildGovernanceProof } from '../../cryptographic_proof/proof/governance_proof_builder.js';
import { buildGovernanceCertificate } from '../../governance_certificate_engine/builder/governance_certificate_builder.js';
import { createLedger, appendAttestation } from '../../ledger/chain/ledger_chain.js';
import { buildGovernanceAttestation } from '../../attestation/builder/attestation_builder.js';
import { signGovernanceObject } from '../../trust_anchor/sign/governance_signer.js';
import { verifyGovernanceCertificateExternal } from '../verify/certificate_verifier.js';
import { verifyGovernanceProofExternal } from '../verify/proof_verifier.js';
import { verifyLedgerIntegrity } from '../verify/ledger_verifier.js';
import { verifySnapshotIntegrity } from '../verify/snapshot_verifier.js';
import { verifyIRISGovernanceState } from '../engine/governance_external_verifier.js';

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

function buildPipeline() {
  const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
  const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
  const decision = evaluateRuntimeAction(
    { action: 'run', requestedFeatures: ['advanced_analysis'] },
    snapshot,
    emptyEnforcement
  );
  const proof = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
  const certificate = buildGovernanceCertificate(
    snapshot,
    emptyEnforcement,
    adaptation,
    decision,
    proof
  );
  const certSignature = signGovernanceObject(certificate);
  const ledger = createLedger();
  appendAttestation(ledger, buildGovernanceAttestation(proof, adaptation, decision));
  return {
    snapshot,
    enforcement: emptyEnforcement,
    adaptation,
    decision,
    proof,
    certificate,
    certSignature,
    ledger,
  };
}

describe('Governance External Verifier', () => {
  it('Test 1 — Certificate verification: valid certificate + signature → valid true', () => {
    const { certificate, certSignature } = buildPipeline();
    const result = verifyGovernanceCertificateExternal(certificate, certSignature);
    assert.strictEqual(result.valid, true);
  });

  it('Test 2 — Proof verification: valid proof + inputs → valid true', () => {
    const { proof, snapshot, enforcement, adaptation, decision } = buildPipeline();
    const result = verifyGovernanceProofExternal(
      proof,
      snapshot,
      enforcement,
      adaptation,
      decision
    );
    assert.strictEqual(result.valid, true);
  });

  it('Test 3 — Ledger integrity: correct ledger → valid true', () => {
    const { ledger } = buildPipeline();
    const result = verifyLedgerIntegrity(ledger);
    assert.strictEqual(result.valid, true);
  });

  it('Test 4 — Tampered ledger: modified entry → valid false', () => {
    const { ledger } = buildPipeline();
    const tamperedEntries = ledger.entries.map((e, i) =>
      i === 0 ? { ...e, attestation_hash: '0'.repeat(64) } : e
    );
    const result = verifyLedgerIntegrity({ entries: tamperedEntries });
    assert.strictEqual(result.valid, false);
  });

  it('Test 5 — Full governance verification: complete inputs → overallValid true', () => {
    const pipeline = buildPipeline();
    const report = verifyIRISGovernanceState({
      certificate: pipeline.certificate,
      certificateSignature: pipeline.certSignature,
      proof: pipeline.proof,
      governanceSnapshot: pipeline.snapshot,
      enforcement: pipeline.enforcement,
      adaptation: pipeline.adaptation,
      runtimeDecision: pipeline.decision,
      ledger: pipeline.ledger,
    });
    assert.strictEqual(report.overallValid, true);
    assert.strictEqual(report.certificateValid, true);
    assert.strictEqual(report.proofValid, true);
    assert.strictEqual(report.ledgerValid, true);
    assert.strictEqual(report.snapshotValid, true);
  });

  it('Snapshot verifier: valid snapshot → valid true', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.82 });
    const result = verifySnapshotIntegrity(snapshot);
    assert.strictEqual(result.valid, true);
  });

  it('Snapshot verifier: invalid tier → valid false', () => {
    const snapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
    const bad = { ...snapshot, tier: 'INVALID' as GovernanceTierSnapshot['tier'] };
    const result = verifySnapshotIntegrity(bad);
    assert.strictEqual(result.valid, false);
  });
});
