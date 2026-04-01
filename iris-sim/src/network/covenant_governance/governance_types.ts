/**
 * Microstep 14Q — Identity & Governance Layer. Types.
 */

export type Role = 'ADMIN' | 'OPERATOR' | 'AUDITOR';

export type GovernanceAction = 'CREATE' | 'UPDATE' | 'DISABLE' | 'ROLLBACK' | 'READ';

export interface Actor {
  readonly actor_id: string;
  readonly roles: readonly Role[];
}
