/**
 * Step 8E — Governance Cryptographic Proof. Proof type.
 */

export interface GovernanceProof {
  readonly proof_id: string;
  readonly governance_snapshot_hash: string;
  readonly policy_enforcement_hash: string;
  readonly adaptation_hash: string;
  readonly runtime_decision_hash: string;
  readonly final_proof_hash: string;
  readonly timestamp: number;
}
