/**
 * Phase 13E — Trust Recovery Framework. Types.
 */

export enum TrustState {
  TRUSTED = 'TRUSTED',
  PROBATION = 'PROBATION',
  COOLDOWN = 'COOLDOWN',
  RESTRICTED = 'RESTRICTED',
}

export interface NodeTrustState {
  readonly node_id: string;
  readonly trust_state: TrustState;
  readonly reputation_score: number;
  readonly state_timestamp: number;
}

export enum RecoveryActionType {
  ENTER_PROBATION = 'ENTER_PROBATION',
  APPLY_COOLDOWN = 'APPLY_COOLDOWN',
  RESTRICT_NODE = 'RESTRICT_NODE',
  RESTORE_TRUST = 'RESTORE_TRUST',
}

export interface RecoveryAction {
  readonly node_id: string;
  readonly action_type: RecoveryActionType;
  readonly action_timestamp: number;
  readonly reason: string;
}
