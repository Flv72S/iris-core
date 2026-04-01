/**
 * Step 8N — Governance Diff Engine tests.
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
import { computeGovernanceDiff } from '../engine/governance_diff_engine.js';
import { verifyGovernanceDiff } from '../verify/governance_diff_verifier.js';

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

function buildGlobalSnapshot(snapshot: GovernanceTierSnapshot): GlobalGovernanceSnapshot {
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

  return buildGlobalGovernanceSnapshot(
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
}

function cloneSnapshot(
  snapshot: GlobalGovernanceSnapshot,
  overrides: Partial<GlobalGovernanceSnapshot>
): GlobalGovernanceSnapshot {
  const next = {
    ...snapshot,
    ...overrides,
  };
  const global_hash = computeGlobalSnapshotHash(next);

  return Object.freeze({
    ...next,
    snapshot_id: sha256Hex(global_hash),
    global_hash,
  });
}

describe('Governance Diff Engine', () => {
  it('Test 1 — No changes', () => {
    const snapshotA = buildGlobalSnapshot(
      makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.6 })
    );
    const snapshotB = cloneSnapshot(snapshotA, {});

    const diff = computeGovernanceDiff(snapshotA, snapshotB);

    assert.strictEqual(diff.changed_components.length, 0);
  });

  it('Test 2 — Tier change', () => {
    const snapshotA = buildGlobalSnapshot(
      makeSnapshot({ tier: 'TIER_1_RESTRICTED', score: 0.4 })
    );
    const snapshotB = buildGlobalSnapshot(
      makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.75 })
    );

    const diff = computeGovernanceDiff(snapshotA, snapshotB);
    const components = diff.changed_components.map((entry) => entry.component);

    assert.ok(components.includes('tier'));
  });

  it('Test 3 — Certificate change', () => {
    const snapshotA = buildGlobalSnapshot(
      makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.75 })
    );
    const snapshotB = cloneSnapshot(snapshotA, {
      certificate_hash: 'a'.repeat(64),
    });

    const diff = computeGovernanceDiff(snapshotA, snapshotB);
    const components = diff.changed_components.map((entry) => entry.component);

    assert.ok(components.includes('certificate'));
  });

  it('Test 4 — Determinism', () => {
    const snapshotA = buildGlobalSnapshot(
      makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.6 })
    );
    const snapshotB = buildGlobalSnapshot(
      makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.75 })
    );

    const first = computeGovernanceDiff(snapshotA, snapshotB);
    const second = computeGovernanceDiff(snapshotA, snapshotB);

    assert.strictEqual(first.diff_hash, second.diff_hash);
  });

  it('Test 5 — Verification', () => {
    const snapshotA = buildGlobalSnapshot(
      makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.6 })
    );
    const snapshotB = cloneSnapshot(snapshotA, {
      certificate_hash: 'b'.repeat(64),
    });

    const diff = computeGovernanceDiff(snapshotA, snapshotB);

    assert.strictEqual(verifyGovernanceDiff(diff, snapshotA, snapshotB), true);
  });

  it('Test 6 — Tampering detection', () => {
    const snapshotA = buildGlobalSnapshot(
      makeSnapshot({ tier: 'TIER_2_CONTROLLED', score: 0.6 })
    );
    const snapshotB = buildGlobalSnapshot(
      makeSnapshot({ tier: 'TIER_3_STABLE', score: 0.75 })
    );
    const diff = computeGovernanceDiff(snapshotA, snapshotB);
    const tampered = {
      ...diff,
      changed_components: [
        ...diff.changed_components,
        {
          component: 'certificate',
          previous_hash: null,
          current_hash: 'tampered',
        },
      ],
    };

    assert.strictEqual(verifyGovernanceDiff(tampered, snapshotA, snapshotB), false);
  });
});
