/**
 * Step 8I — Governance Certificate Export. Fully serializable JSON bundle.
 */

import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import type { AdaptationSnapshot } from '../../self_adaptation/types/adaptation_types.js';
import type { RuntimeDecision } from '../../runtime_gate/types/runtime_types.js';
import type { GovernanceProof } from '../../cryptographic_proof/types/proof_types.js';
import type { GovernanceCertificate } from '../types/certification_types.js';
import { buildGovernanceCertificate } from '../builder/governance_certificate_builder.js';

export interface GovernanceCertificateExport {
  readonly certificate: GovernanceCertificate;
  readonly governanceSnapshot: GovernanceTierSnapshot;
  readonly enforcement: PolicyEnforcementResult;
  readonly adaptation: AdaptationSnapshot;
  readonly runtimeDecision: RuntimeDecision;
  readonly governanceProof: GovernanceProof;
}

/**
 * Build certificate and return full export bundle (JSON-serializable).
 */
export function exportGovernanceCertificate(
  governanceSnapshot: GovernanceTierSnapshot,
  enforcement: PolicyEnforcementResult,
  adaptation: AdaptationSnapshot,
  runtimeDecision: RuntimeDecision,
  governanceProof: GovernanceProof
): GovernanceCertificateExport {
  const certificate = buildGovernanceCertificate(
    governanceSnapshot,
    enforcement,
    adaptation,
    runtimeDecision,
    governanceProof
  );
  return Object.freeze({
    certificate,
    governanceSnapshot,
    enforcement,
    adaptation,
    runtimeDecision,
    governanceProof,
  });
}
