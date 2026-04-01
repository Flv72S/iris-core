/**
 * Step 10C — Cross-Node Governance Verification Engine. Types.
 */

import type { IRISGovernanceCertificate } from '../../../governance/certification_format/types/certificate_types.js';
import type { IRISNodeIdentity } from '../../node_identity/types/iris_node_identity_types.js';
import type { GovernanceVerificationResult } from '../../../governance/verification_engine/types/governance_verification_types.js';

export interface CrossNodeVerificationInput {
  readonly certificate: IRISGovernanceCertificate;
  readonly issuing_node_identity: IRISNodeIdentity;
}

export interface CrossNodeVerificationResult {
  readonly certificate_id: string;
  readonly issuing_node_id: string;
  readonly node_identity_valid: boolean;
  readonly governance_verification: GovernanceVerificationResult;
  readonly verification_timestamp: number;
}
