/**
 * Step 8M — Global Governance Snapshot builder.
 */

import { createHash } from 'node:crypto';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import type { AdaptationSnapshot } from '../../self_adaptation/types/adaptation_types.js';
import type { RuntimeDecision } from '../../runtime_gate/types/runtime_types.js';
import type { GovernanceProof } from '../../cryptographic_proof/types/proof_types.js';
import type { GovernanceAttestation } from '../../attestation/types/attestation_types.js';
import type { GovernanceLedgerEntry } from '../../ledger/types/ledger_types.js';
import type { GovernanceCertificate } from '../../governance_certificate_engine/types/certification_types.js';
import type { IRISRootKey } from '../../trust_anchor/types/trust_anchor_types.js';
import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import { computeGlobalSnapshotHash } from '../hashing/global_snapshot_hash.js';
import type {
  GlobalGovernanceSnapshot,
  GlobalSnapshotHashFields,
} from '../types/global_snapshot_types.js';

function sha256Hex(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export function buildGlobalGovernanceSnapshot(
  governanceSnapshot: GovernanceTierSnapshot,
  enforcement: PolicyEnforcementResult,
  adaptation: AdaptationSnapshot,
  runtimeDecision: RuntimeDecision,
  proof: GovernanceProof,
  attestation: GovernanceAttestation,
  ledgerHead: GovernanceLedgerEntry,
  certificate: GovernanceCertificate,
  trustAnchor: IRISRootKey,
  watcherState: unknown
): GlobalGovernanceSnapshot {
  const hashFields: GlobalSnapshotHashFields = Object.freeze({
    governance_snapshot_hash: hashObjectDeterministic(governanceSnapshot),
    policy_enforcement_hash: hashObjectDeterministic(enforcement),
    adaptation_hash: hashObjectDeterministic(adaptation),
    runtime_state_hash: hashObjectDeterministic(runtimeDecision),
    governance_proof_hash: hashObjectDeterministic(proof),
    attestation_hash: hashObjectDeterministic(attestation),
    ledger_head_hash: ledgerHead.ledger_hash,
    certificate_hash: certificate.final_certificate_hash,
    watcher_state_hash: hashObjectDeterministic(watcherState),
  });
  const global_hash = computeGlobalSnapshotHash(hashFields);
  const snapshot_id = sha256Hex(global_hash);

  return Object.freeze({
    snapshot_id,
    timestamp: Date.now(),
    governance_tier: governanceSnapshot.tier,
    trust_anchor_id: trustAnchor.key_id,
    ...hashFields,
    global_hash,
  });
}
