/**
 * UxExperienceKillSwitch — C.6.5
 * OFF → ritorna sempre stato NEUTRAL con confidence low.
 */

import type { UxExperienceState } from './UxExperienceState';

export const UX_EXPERIENCE_COMPONENT_ID = 'ux-experience-state';

export type UxExperienceRegistry = Record<string, boolean>;

export function isUxExperienceEnabled(registry: UxExperienceRegistry): boolean {
  return registry[UX_EXPERIENCE_COMPONENT_ID] === true;
}

export function neutralExperienceState(now: number): UxExperienceState {
  return Object.freeze({
    label: 'NEUTRAL',
    confidenceBand: 'low',
    stability: 'stable',
    dominantSignals: Object.freeze([]),
    secondarySignals: Object.freeze([]),
    suggestedLens: 'neutral',
    explanation: 'No clear experience state available.',
    derivedAt: now,
  });
}
