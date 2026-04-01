/**
 * Step 8M — Global Governance Snapshot tests.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import { computeAdaptationSnapshot } from '../../self_adaptation/engine/self_adaptation_engine.js';
import { evaluateRuntimeAction } from '../../runtime_gate/engine/governance_runtime_gate.js';
import { buildGovernanceProof } from '../../cryptographic_proof/proof/governance_proof_builder.js';
import { buildGovernanceAttestation } from '../../attestation/builder/attestation_builder.js';
import { createLedger, appendAttestation, getLatestEntry } from '../../ledger/chain/ledger_chain.js';
import { buildGovernanceCertificate } from '../../governance_certificate_engine/builder/governance_certificate_builder.js';
import { TRUST_ANCHOR_REGISTRY } from '../../trust_anchor/registry/trust_anchor_registry.js';
import { runGovernanceCheck } from '../../watcher/watcher/governance_watcher.js';
import { buildGlobalGovernanceSnapshot } from '../builder/global_snapshot_builder.js';
import {
  exportGlobalSnapshotAuditRecord,
  exportGlobalSnapshotJSON,
} from '../export/global_snapshot_exporter.js';
import { verifyGlobalSnapshot } from '../verify/global_snapshot_verifier.js';

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

function buildPipelineState() {
  const governanceSnapshot = makeSnapshot({ tier: 'TIER_3_STABLE' });
  const enforcement = emptyEnforcement;
  const adaptation = computeAdaptationSnapshot(governanceSnapshot, enforcement);
  const runtimeDecision = evaluateRuntimeAction(
    { action: 'run', requestedFeatures: ['advanced_analysis'] },
    governanceSnapshot,
    enforcement
  );
  const governanceProof = buildGovernanceProof(
    governanceSnapshot,
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
    governanceSnapshot,
    enforcement,
    adaptation,
    runtimeDecision,
    governanceProof
  );
  const watcherState = runGovernanceCheck({
    governanceSnapshot,
    policyEnforcement: enforcement,
    runtimeDecision,
    certifiedSnapshotHash: certificate.governance_snapshot_hash,
    ledger,
  });

  return {
    governanceSnapshot,
    enforcement,
    adaptation,
    runtimeDecision,
    governanceProof,
    attestation,
    ledgerHead,
    certificate,
    trustAnchor: TRUST_ANCHOR_REGISTRY.root,
    watcherState,
  };
}

describe('Global Governance Snapshot', () => {
  it('Test 1 — Snapshot creation: snapshot_id and global_hash exist', () => {
    const state = buildPipelineState();
    const snapshot = buildGlobalGovernanceSnapshot(
      state.governanceSnapshot,
      state.enforcement,
      state.adaptation,
      state.runtimeDecision,
      state.governanceProof,
      state.attestation,
      state.ledgerHead,
      state.certificate,
      state.trustAnchor,
      state.watcherState
    );

    assert.ok(snapshot.snapshot_id);
    assert.ok(snapshot.global_hash);
    assert.strictEqual(snapshot.snapshot_id.length, 64);
    assert.strictEqual(snapshot.global_hash.length, 64);
  });

  it('Test 2 — Determinism: same inputs → same global_hash', () => {
    const state = buildPipelineState();
    const first = buildGlobalGovernanceSnapshot(
      state.governanceSnapshot,
      state.enforcement,
      state.adaptation,
      state.runtimeDecision,
      state.governanceProof,
      state.attestation,
      state.ledgerHead,
      state.certificate,
      state.trustAnchor,
      state.watcherState
    );
    const second = buildGlobalGovernanceSnapshot(
      state.governanceSnapshot,
      state.enforcement,
      state.adaptation,
      state.runtimeDecision,
      state.governanceProof,
      state.attestation,
      state.ledgerHead,
      state.certificate,
      state.trustAnchor,
      state.watcherState
    );

    assert.strictEqual(first.global_hash, second.global_hash);
    assert.strictEqual(first.snapshot_id, second.snapshot_id);
  });

  it('Test 3 — Tampering detection: certificate_hash modified → verify false', () => {
    const state = buildPipelineState();
    const snapshot = buildGlobalGovernanceSnapshot(
      state.governanceSnapshot,
      state.enforcement,
      state.adaptation,
      state.runtimeDecision,
      state.governanceProof,
      state.attestation,
      state.ledgerHead,
      state.certificate,
      state.trustAnchor,
      state.watcherState
    );
    const tampered = {
      ...snapshot,
      certificate_hash: '0'.repeat(64),
    };

    assert.strictEqual(verifyGlobalSnapshot(tampered), false);
  });

  it('Test 4 — Ledger integrity: ledger_head_hash modified → verify false', () => {
    const state = buildPipelineState();
    const snapshot = buildGlobalGovernanceSnapshot(
      state.governanceSnapshot,
      state.enforcement,
      state.adaptation,
      state.runtimeDecision,
      state.governanceProof,
      state.attestation,
      state.ledgerHead,
      state.certificate,
      state.trustAnchor,
      state.watcherState
    );
    const tampered = {
      ...snapshot,
      ledger_head_hash: 'f'.repeat(64),
    };

    assert.strictEqual(verifyGlobalSnapshot(tampered), false);
  });

  it('Test 5 — Export: JSON valid and compact audit record generated', () => {
    const state = buildPipelineState();
    const snapshot = buildGlobalGovernanceSnapshot(
      state.governanceSnapshot,
      state.enforcement,
      state.adaptation,
      state.runtimeDecision,
      state.governanceProof,
      state.attestation,
      state.ledgerHead,
      state.certificate,
      state.trustAnchor,
      state.watcherState
    );
    const exported = exportGlobalSnapshotJSON(snapshot);
    const parsed = JSON.parse(exported) as { readonly global_hash: string };
    const auditRecord = exportGlobalSnapshotAuditRecord(snapshot);

    assert.strictEqual(parsed.global_hash, snapshot.global_hash);
    assert.strictEqual(auditRecord.tier, snapshot.governance_tier);
    assert.strictEqual(auditRecord.certificate, snapshot.certificate_hash);
    assert.strictEqual(auditRecord.ledger_head, snapshot.ledger_head_hash);
  });
});
