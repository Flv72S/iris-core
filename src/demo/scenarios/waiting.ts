/**
 * Demo Scenario — Attesa Risposta (Demo Narrative)
 * Dati statici, leggibili, spiegabili.
 */

import type { UxStateSnapshot } from '../../messaging-system/ux-state/UxStateSnapshot';
import type { UxExperienceState } from '../../product/ux-experience/UxExperienceState';
import type { DemoScenario } from './focus';

const derivedAt = 1704110400000;

const uxState: UxStateSnapshot = Object.freeze({
  states: Object.freeze([
    Object.freeze({
      stateId: 'wait-1',
      stateType: 'WAITING_REPLY',
      title: 'Waiting for response',
      derivedAt,
    }),
    Object.freeze({
      stateId: 'action-1',
      stateType: 'ACTION_PENDING',
      title: 'Message sent',
      derivedAt,
    }),
  ]),
  derivedAt,
});

const experience: UxExperienceState = Object.freeze({
  label: 'WAITING',
  confidenceBand: 'medium',
  stability: 'stable',
  dominantSignals: Object.freeze(['WAITING_REPLY']),
  secondarySignals: Object.freeze(['ACTION_PENDING']),
  suggestedLens: 'neutral',
  explanation:
    'You are waiting for a response. No action is required at the moment.',
  derivedAt,
});

export const waitingScenario: DemoScenario = Object.freeze({
  id: 'waiting',
  label: 'Attesa risposta',
  uxState,
  experience,
});
