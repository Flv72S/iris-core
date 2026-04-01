/**
 * Phase 9.1 — Mode Definition (formal, immutable)
 */

export type BehaviorMode = 'DEFAULT' | 'FOCUS' | 'WELLBEING';

export type ModeCapability =
  | 'EXECUTION_CONSTRAINTS'
  | 'SAFETY_INTERPRETATION'
  | 'ESCALATION_SENSITIVITY'
  | 'EXPLAINABILITY_TONE';

export interface ModeDefinition {
  readonly id: BehaviorMode;
  readonly description: string;
  readonly affects: readonly ModeCapability[];
  readonly forbids: readonly ModeCapability[];
  readonly deterministicHash: string;
}
