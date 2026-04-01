/**
 * Step 8G — Governance Ledger tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import { computeAdaptationSnapshot } from '../../self_adaptation/engine/self_adaptation_engine.js';
import { evaluateRuntimeAction } from '../../runtime_gate/engine/governance_runtime_gate.js';
import { buildGovernanceProof } from '../../cryptographic_proof/proof/governance_proof_builder.js';
import { buildGovernanceAttestation } from '../../attestation/builder/attestation_builder.js';
import { createLedger, appendAttestation, getLatestEntry, getLedgerSize } from '../chain/ledger_chain.js';
import { verifyLedger } from '../verify/ledger_verifier.js';

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

function makeAttestation(tier: GovernanceTierSnapshot['tier']) {
  const snapshot = makeSnapshot({ tier });
  const adaptation = computeAdaptationSnapshot(snapshot, emptyEnforcement);
  const decision = evaluateRuntimeAction({ action: 'run' }, snapshot, emptyEnforcement);
  const proof = buildGovernanceProof(snapshot, emptyEnforcement, adaptation, decision);
  return buildGovernanceAttestation(proof, adaptation, decision);
}

describe('Governance Ledger', () => {
  it('Test 1 — Genesis entry: first attestation → index 0, previous_hash GENESIS', () => {
    const ledger = createLedger();
    const attestation = makeAttestation('TIER_3_STABLE');
    const entry = appendAttestation(ledger, attestation);
    assert.strictEqual(entry.index, 0);
    assert.strictEqual(entry.previous_hash, 'GENESIS');
  });

  it('Test 2 — Chain growth: 3 attestations → entries.length === 3', () => {
    const ledger = createLedger();
    appendAttestation(ledger, makeAttestation('TIER_1_RESTRICTED'));
    appendAttestation(ledger, makeAttestation('TIER_2_CONTROLLED'));
    appendAttestation(ledger, makeAttestation('TIER_3_STABLE'));
    assert.strictEqual(getLedgerSize(ledger), 3);
    assert.strictEqual(ledger.entries.length, 3);
  });

  it('Test 3 — Chain verification: verifyLedger(ledger) === true', () => {
    const ledger = createLedger();
    appendAttestation(ledger, makeAttestation('TIER_2_CONTROLLED'));
    appendAttestation(ledger, makeAttestation('TIER_3_STABLE'));
    assert.strictEqual(verifyLedger(ledger), true);
  });

  it('Test 4 — Tampering detection: modify entries[1].attestation_hash → verify false', () => {
    const ledger = createLedger();
    appendAttestation(ledger, makeAttestation('TIER_1_RESTRICTED'));
    appendAttestation(ledger, makeAttestation('TIER_2_CONTROLLED'));
    appendAttestation(ledger, makeAttestation('TIER_3_STABLE'));
    assert.strictEqual(verifyLedger(ledger), true);
    const tamperedEntries = ledger.entries.map((e, i) =>
      i === 1 ? { ...e, attestation_hash: '0'.repeat(64) } : e
    );
    const tamperedLedger = { entries: tamperedEntries };
    assert.strictEqual(verifyLedger(tamperedLedger), false);
  });

  it('Test 5 — Determinism: same inputs → same hash sequence', () => {
    const a1 = makeAttestation('TIER_2_CONTROLLED');
    const a2 = makeAttestation('TIER_3_STABLE');
    const ledger1 = createLedger();
    appendAttestation(ledger1, a1);
    appendAttestation(ledger1, a2);
    const ledger2 = createLedger();
    appendAttestation(ledger2, a1);
    appendAttestation(ledger2, a2);
    assert.strictEqual(ledger1.entries[0]!.ledger_hash, ledger2.entries[0]!.ledger_hash);
    assert.strictEqual(ledger1.entries[1]!.ledger_hash, ledger2.entries[1]!.ledger_hash);
  });

  it('getLatestEntry and getLedgerSize', () => {
    const ledger = createLedger();
    assert.strictEqual(getLatestEntry(ledger), undefined);
    assert.strictEqual(getLedgerSize(ledger), 0);
    const att = makeAttestation('TIER_3_STABLE');
    const entry = appendAttestation(ledger, att);
    assert.strictEqual(getLatestEntry(ledger), entry);
    assert.strictEqual(getLedgerSize(ledger), 1);
  });
});
