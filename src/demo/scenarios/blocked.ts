/**
 * Demo Scenario — Blocco Wellbeing (Demo Narrative)
 * Dati statici, leggibili, spiegabili.
 */

import type { UxStateSnapshot } from '../../messaging-system/ux-state/UxStateSnapshot';
import type { UxExperienceState } from '../../product/ux-experience/UxExperienceState';
import type { DemoScenario } from './focus';

const derivedAt = 1704110400000;

const uxState: UxStateSnapshot = Object.freeze({
  states: Object.freeze([
    Object.freeze({
      stateId: 'wellbeing-1',
      stateType: 'WELLBEING_BLOCK',
      title: 'Wellbeing gate active',
      severity: 'attention',
      derivedAt,
    }),
    Object.freeze({
      stateId: 'fail-1',
      stateType: 'DELIVERY_FAILED',
      title: 'Some deliveries failed',
      derivedAt,
    }),
  ]),
  derivedAt,
});

const experience: UxExperienceState = Object.freeze({
  label: 'BLOCKED',
  confidenceBand: 'medium',
  stability: 'volatile',
  dominantSignals: Object.freeze(['WELLBEING_BLOCK']),
  secondarySignals: Object.freeze(['DELIVERY_FAILED']),
  suggestedLens: 'wellbeing',
  explanation:
    'Multiple signals detected. It may be helpful to pause or reduce input.',
  derivedAt,
});

export const blockedScenario: DemoScenario = Object.freeze({
  id: 'blocked',
  label: 'Blocco wellbeing',
  uxState,
  experience,
});
