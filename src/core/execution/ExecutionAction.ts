/**
 * ExecutionAction — Intent esplicito da pipeline. MUST NOT: priority, score, confidence, condition, reasoning.
 */

export type ExecutionActionType =
  | 'SEND_NOTIFICATION'
  | 'SCHEDULE_EVENT'
  | 'BLOCK_INPUT'
  | 'DEFER_MESSAGE';

export interface ExecutionAction {
  readonly id: string;
  readonly type: ExecutionActionType;
  readonly payload: unknown;
  readonly requestedAt: number;
  readonly sourceFeature: string;
}
