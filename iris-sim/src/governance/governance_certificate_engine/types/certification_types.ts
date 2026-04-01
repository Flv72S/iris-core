/**
 * Step 8I — Governance Certification Engine. Certificate type (full state certification).
 */

export interface GovernanceCertificate {
  readonly certificate_id: string;
  readonly tier: string;
  readonly governance_snapshot_hash: string;
  readonly policy_enforcement_hash: string;
  readonly adaptation_hash: string;
  readonly runtime_decision_hash: string;
  readonly governance_proof_hash: string;
  readonly final_certificate_hash: string;
  readonly timestamp: number;
  readonly issuer: string;
  readonly signature: string;
}
