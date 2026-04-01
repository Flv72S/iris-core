/**
 * Microstep 14M — Covenant Runtime & Event Engine. Shared types.
 */

export type CovenantEventType =
  | 'CONSENSUS_COMPLETED'
  | 'STATE_UPDATED'
  | 'REPLAY_COMPLETED'
  | 'MANUAL_TRIGGER'
  | 'COVENANT_VIOLATION';

export interface CovenantEvent {
  readonly type: CovenantEventType;
  readonly payload?: unknown;
  readonly timestamp: number;
}
