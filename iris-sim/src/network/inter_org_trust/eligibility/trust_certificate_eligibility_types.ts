/**
 * Phase 11D.2 — Trust Certificate Eligibility. Types.
 * All objects are immutable.
 */

export type CertificateEligibilityStatus = 'ELIGIBLE' | 'PROBATION' | 'INELIGIBLE';

export type CertificateEligibilityReason =
  | 'TRUST_HIGH'
  | 'TRUST_MEDIUM'
  | 'TRUST_LOW'
  | 'NODE_UNTRUSTED';

export interface NodeCertificateEligibility {
  readonly node_id: string;
  readonly organization_id: string;
  readonly trust_index: number;
  readonly trust_level: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNTRUSTED';
  readonly eligibility_status: CertificateEligibilityStatus;
  readonly eligibility_reason: CertificateEligibilityReason;
  readonly evaluated_timestamp: number;
}
