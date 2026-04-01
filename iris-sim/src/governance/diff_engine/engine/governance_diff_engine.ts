/**
 * Step 8N — Governance Diff Engine. Deterministic snapshot comparison.
 */

import type { GlobalGovernanceSnapshot } from '../../global_snapshot/types/global_snapshot_types.js';
import { hashObjectDeterministic } from '../../cryptographic_proof/hashing/governance_hash.js';
import { computeGovernanceDiffHash } from '../hashing/governance_diff_hash.js';
import type {
  GovernanceComponentChange,
  GovernanceDiffReport,
} from '../types/governance_diff_types.js';

const COMPONENTS = [
  'tier',
  'policy_enforcement',
  'adaptation',
  'runtime_decision',
  'governance_proof',
  'attestation',
  'ledger_head',
  'certificate',
  'trust_anchor',
  'watcher_state',
] as const;

function getComponentHash(
  snapshot: GlobalGovernanceSnapshot,
  component: (typeof COMPONENTS)[number]
): string | null {
  switch (component) {
    case 'tier':
      return hashObjectDeterministic(snapshot.governance_tier);
    case 'policy_enforcement':
      return snapshot.policy_enforcement_hash;
    case 'adaptation':
      return snapshot.adaptation_hash;
    case 'runtime_decision':
      return snapshot.runtime_state_hash;
    case 'governance_proof':
      return snapshot.governance_proof_hash;
    case 'attestation':
      return snapshot.attestation_hash;
    case 'ledger_head':
      return snapshot.ledger_head_hash;
    case 'certificate':
      return snapshot.certificate_hash;
    case 'trust_anchor':
      return hashObjectDeterministic(snapshot.trust_anchor_id);
    case 'watcher_state':
      return snapshot.watcher_state_hash;
  }
}

export function computeGovernanceDiff(
  snapshotA: GlobalGovernanceSnapshot,
  snapshotB: GlobalGovernanceSnapshot
): GovernanceDiffReport {
  const changed_components: GovernanceComponentChange[] = [];

  for (const component of COMPONENTS) {
    const previous_hash = getComponentHash(snapshotA, component);
    const current_hash = getComponentHash(snapshotB, component);
    if (previous_hash !== current_hash) {
      changed_components.push({
        component,
        previous_hash,
        current_hash,
      });
    }
  }

  const diff_hash = computeGovernanceDiffHash(
    snapshotA.global_hash,
    snapshotB.global_hash,
    changed_components
  );

  return Object.freeze({
    snapshot_A_hash: snapshotA.global_hash,
    snapshot_B_hash: snapshotB.global_hash,
    changed_components: Object.freeze(changed_components),
    diff_hash,
    timestamp: Math.max(snapshotA.timestamp, snapshotB.timestamp),
  });
}
