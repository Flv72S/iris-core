/**
 * UxExperienceState — C.6.5
 * Stato esperienziale singolare. Descrive, non prescrive.
 * MUST NOT: action, command, recommendation, score, priority, automation, learning, feedback emission.
 */

export type ConfidenceBand = 'low' | 'medium' | 'high';
export type StabilityLevel = 'stable' | 'volatile';

export type UxExperienceLabel =
  | 'FOCUSED'
  | 'OVERLOADED'
  | 'IDLE'
  | 'REFLECTIVE'
  | 'WAITING'
  | 'BLOCKED'
  | 'NEUTRAL';

export type UxSuggestedLens = 'focus' | 'wellbeing' | 'voice' | 'neutral';

export interface UxExperienceState {
  readonly label: UxExperienceLabel;
  readonly confidenceBand: ConfidenceBand;
  readonly stability: StabilityLevel;
  readonly dominantSignals: readonly string[];
  readonly secondarySignals: readonly string[];
  readonly suggestedLens: UxSuggestedLens;
  readonly explanation: string;
  readonly derivedAt: number;
}
