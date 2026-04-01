/**
 * Step 8H — Governance Time Machine tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import { computeAdaptationSnapshot } from '../../self_adaptation/engine/self_adaptation_engine.js';
import { evaluateRuntimeAction } from '../../runtime_gate/engine/governance_runtime_gate.js';
import { buildGovernanceProof } from '../../cryptographic_proof/proof/governance_proof_builder.js';
import { buildGovernanceAttestation } from '../../attestation/builder/attestation_builder.js';
import { createLedger, appendAttestation } from '../../ledger/chain/ledger_chain.js';
import { verifyLedger } from '../../ledger/verify/ledger_verifier.js';
import { findClosestSnapshot, getStateAt } from '../governance_time_machine.js';
import { replayFromSnapshot } from '../governance_replay_engine.js';
import { getHistory, getEventsByType } from '../governance_history_query.js';

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

describe('Governance Time Machine', () => {
  it('findClosestSnapshot returns nearest entry before timestamp', () => {
    const ledger = createLedger();
    appendAttestation(ledger, makeAttestation('TIER_1_RESTRICTED'));
    appendAttestation(ledger, makeAttestation('TIER_2_CONTROLLED'));
    appendAttestation(ledger, makeAttestation('TIER_3_STABLE'));

    const future = Date.now() + 1e6;
    const last = findClosestSnapshot(ledger, future);
    assert.ok(last);
    assert.strictEqual(last!.index, 2);

    const beforeAny = 0;
    const none = findClosestSnapshot(ledger, beforeAny);
    assert.strictEqual(none, undefined);
  });

  it('getStateAt returns state at or before target timestamp', () => {
    const ledger = createLedger();
    appendAttestation(ledger, makeAttestation('TIER_2_CONTROLLED'));
    appendAttestation(ledger, makeAttestation('TIER_3_STABLE'));

    const state = getStateAt(ledger, Date.now() + 1e6);
    assert.ok(state);
    assert.strictEqual(state!.entry.index, 1);
  });

  it('getStateAt with no entries returns undefined', () => {
    const ledger = createLedger();
    const state = getStateAt(ledger, 9999);
    assert.strictEqual(state, undefined);
  });

  it('replayFromSnapshot is deterministic (no events)', () => {
    const ledger = createLedger();
    appendAttestation(ledger, makeAttestation('TIER_2_CONTROLLED'));
    const entry = ledger.entries[0]!;
    const state = replayFromSnapshot(entry, []);
    assert.strictEqual(state.entry.ledger_hash, entry.ledger_hash);
    assert.strictEqual(state.timestamp, entry.timestamp);
  });

  it('getHistory returns entries in time range', () => {
    const ledger = createLedger();
    appendAttestation(ledger, makeAttestation('TIER_1_RESTRICTED'));
    appendAttestation(ledger, makeAttestation('TIER_2_CONTROLLED'));
    appendAttestation(ledger, makeAttestation('TIER_3_STABLE'));

    const hist = getHistory(ledger, 0, Number.MAX_SAFE_INTEGER);
    assert.strictEqual(hist.length, 3);
  });

  it('getEventsByType("attestation") returns all entries', () => {
    const ledger = createLedger();
    appendAttestation(ledger, makeAttestation('TIER_2_CONTROLLED'));
    const events = getEventsByType(ledger, 'attestation');
    assert.strictEqual(events.length, 1);
  });

  it('no mutation of ledger: verifyLedger still true after queries', () => {
    const ledger = createLedger();
    appendAttestation(ledger, makeAttestation('TIER_2_CONTROLLED'));
    findClosestSnapshot(ledger, 2000);
    getStateAt(ledger, 2000);
    getHistory(ledger, 0, 9999);
    assert.strictEqual(verifyLedger(ledger), true);
  });
});
