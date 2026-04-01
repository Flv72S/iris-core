import type { BehaviorMode } from '../definition/mode.types';

export type ModeTransitionStage = 'REQUESTED' | 'IN_PROGRESS' | 'EFFECTIVE' | 'STABILIZED';

export interface ModeTransitionEvent {
  readonly from: BehaviorMode;
  readonly to: BehaviorMode;
  readonly stage: ModeTransitionStage;
  readonly initiatedAt: string;
  readonly effectiveAt: string;
  readonly rationale: string;
}
