/**
 * Step 8K — Governance External Verifier Engine. Full governance state verification report.
 */

import type { GovernanceCertificate } from '../../governance_certificate_engine/types/certification_types.js';
import type { GovernanceSignature } from '../../trust_anchor/types/trust_anchor_types.js';
import type { GovernanceProof } from '../../cryptographic_proof/types/proof_types.js';
import type { GovernanceTierSnapshot } from '../../tiering/snapshot.js';
import type { PolicyEnforcementResult } from '../../policy_engine/enforcement/enforcement_engine.js';
import type { AdaptationSnapshot } from '../../self_adaptation/types/adaptation_types.js';
import type { RuntimeDecision } from '../../runtime_gate/types/runtime_types.js';
import type { GovernanceLedger } from '../../ledger/types/ledger_types.js';
import type { GovernanceVerificationReport } from '../types/verifier_types.js';
import { verifyGovernanceCertificateExternal } from '../verify/certificate_verifier.js';
import { verifyGovernanceProofExternal } from '../verify/proof_verifier.js';
import { verifyLedgerIntegrity } from '../verify/ledger_verifier.js';
import { verifySnapshotIntegrity } from '../verify/snapshot_verifier.js';

export interface VerifyIRISGovernanceStateParams {
  readonly certificate: GovernanceCertificate;
  readonly certificateSignature: GovernanceSignature;
  readonly proof: GovernanceProof;
  readonly governanceSnapshot: GovernanceTierSnapshot;
  readonly enforcement: PolicyEnforcementResult;
  readonly adaptation: AdaptationSnapshot;
  readonly runtimeDecision: RuntimeDecision;
  readonly ledger: GovernanceLedger;
}

/**
 * Run full external verification pipeline. Returns report with overallValid = true only if all checks pass.
 */
export function verifyIRISGovernanceState(
  params: VerifyIRISGovernanceStateParams
): GovernanceVerificationReport {
  const certificateValid = verifyGovernanceCertificateExternal(
    params.certificate,
    params.certificateSignature
  ).valid;

  const proofValid = verifyGovernanceProofExternal(
    params.proof,
    params.governanceSnapshot,
    params.enforcement,
    params.adaptation,
    params.runtimeDecision
  ).valid;

  const ledgerValid = verifyLedgerIntegrity(params.ledger).valid;

  const snapshotValid = verifySnapshotIntegrity(params.governanceSnapshot).valid;

  const overallValid =
    certificateValid && proofValid && ledgerValid && snapshotValid;

  return Object.freeze({
    certificateValid,
    proofValid,
    ledgerValid,
    snapshotValid,
    overallValid,
  });
}
