/**
 * Demo Scenario — Focus Attivo (Demo Narrative)
 * Dati statici, leggibili, spiegabili.
 */

import type { UxStateSnapshot } from '../../messaging-system/ux-state/UxStateSnapshot';
import type { UxExperienceState } from '../../product/ux-experience/UxExperienceState';

export interface DemoScenario {
  readonly id: string;
  readonly label: string;
  readonly uxState: UxStateSnapshot;
  readonly experience: UxExperienceState;
}

const derivedAt = 1704110400000;

const uxState: UxStateSnapshot = Object.freeze({
  states: Object.freeze([
    Object.freeze({
      stateId: 'focus-1',
      stateType: 'FOCUS_ACTIVE',
      title: 'Focus mode is active',
      derivedAt,
    }),
    Object.freeze({
      stateId: 'pending-1',
      stateType: 'ACTION_PENDING',
      title: 'Non-urgent actions queued',
      severity: 'info',
      derivedAt,
    }),
  ]),
  derivedAt,
});

const experience: UxExperienceState = Object.freeze({
  label: 'FOCUSED',
  confidenceBand: 'medium',
  stability: 'stable',
  dominantSignals: Object.freeze(['FOCUS_ACTIVE']),
  secondarySignals: Object.freeze(['ACTION_PENDING']),
  suggestedLens: 'focus',
  explanation:
    'You are currently in a focused work session. Non-essential interactions are minimized.',
  derivedAt,
});

export const focusScenario: DemoScenario = Object.freeze({
  id: 'focus',
  label: 'Focus attivo',
  uxState,
  experience,
});
