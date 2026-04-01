/**
 * Phase 12A — Governance Action Model. Types.
 * All types are immutable and serialization-safe.
 */

/** Type of governance operation. String literal types only; deterministic. */
export type ActionType =
  | 'NODE_TRUST_REVOCATION'
  | 'NODE_TRUST_RESTORE'
  | 'NODE_BLACKLIST'
  | 'NODE_WHITELIST'
  | 'POLICY_UPDATE'
  | 'PROTOCOL_PARAMETER_UPDATE'
  | 'FEDERATION_ALERT'
  | 'GOVERNANCE_METADATA_UPDATE';

/** Lifecycle state of the action. */
export type ActionStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'REJECTED'
  | 'EXECUTED'
  | 'FAILED';

/** Flexible structure for action parameters. Immutable; supports deterministic serialization. */
export interface GovernanceActionMetadata {
  readonly parameters: Record<string, unknown>;
}

/** Primary governance action structure. All fields readonly. */
export interface GovernanceAction {
  readonly action_id: string;
  readonly initiator_id: string;
  readonly action_type: ActionType;
  readonly metadata: GovernanceActionMetadata;
  readonly status: ActionStatus;
  readonly timestamp: number;
}
