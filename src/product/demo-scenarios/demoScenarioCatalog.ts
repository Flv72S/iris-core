/**
 * Catalogo deterministico di scenari demo.
 * Oggetti frozen, derivedAt fisso. Nessuna logica, sola composizione.
 */

import type {
  UxStateSnapshot,
  UxState,
  UxExperienceState,
  OrchestratedFeature,
} from '../ux-contract';
import type { DemoScenarioId } from './DemoScenarioId';
import type { DemoScenarioDefinition } from './DemoScenarioDefinition';

const DERIVED_AT = 1704110400000;

function s(snap: UxStateSnapshot): UxStateSnapshot {
  return Object.freeze(snap);
}
function st(state: UxState): UxState {
  return Object.freeze(state);
}
function e(exp: UxExperienceState): UxExperienceState {
  return Object.freeze(exp);
}
function f(feat: OrchestratedFeature): OrchestratedFeature {
  return Object.freeze(feat);
}

const FOCUS_ACTIVE: DemoScenarioDefinition = Object.freeze({
  id: 'FOCUS_ACTIVE',
  description: 'Focus mode active; FOCUSED experience; Daily Focus and Smart Summary visible.',
  uxState: s({
    states: Object.freeze([
      st({
        stateId: 'focus-1',
        stateType: 'FOCUS_ACTIVE',
        title: 'Focus mode is active',
        derivedAt: DERIVED_AT,
      }),
    ]),
    derivedAt: DERIVED_AT,
  }),
  experience: e({
    label: 'FOCUSED',
    confidenceBand: 'high',
    stability: 'stable',
    dominantSignals: Object.freeze(['FOCUS_ACTIVE']),
    secondarySignals: Object.freeze([]),
    suggestedLens: 'focus',
    explanation:
      'You are in a focused work session. Non-essential interactions are minimized.',
    derivedAt: DERIVED_AT,
  }),
  features: Object.freeze([
    f({
      featureId: 'daily-focus',
      featureType: 'FOCUS_GUARD',
      title: 'Daily Focus',
      visibility: 'visible',
      priority: 'normal',
      explanation: 'Focus context is active and reflected in the UI.',
      appliedMode: 'DEFAULT',
      derivedAt: DERIVED_AT,
    }),
    f({
      featureId: 'smart-summary',
      featureType: 'SMART_INBOX',
      title: 'Smart Summary',
      visibility: 'visible',
      priority: 'normal',
      explanation: 'Messages are grouped and summarized for your current context.',
      appliedMode: 'DEFAULT',
      derivedAt: DERIVED_AT,
    }),
  ]),
});

const WAITING_REPLY: DemoScenarioDefinition = Object.freeze({
  id: 'WAITING_REPLY',
  description: 'Waiting for reply; ACTION_PENDING; Anti-Ghosting and Smart Inbox.',
  uxState: s({
    states: Object.freeze([
      st({
        stateId: 'wait-1',
        stateType: 'WAITING_REPLY',
        title: 'Waiting for reply',
        derivedAt: DERIVED_AT,
      }),
      st({
        stateId: 'pending-1',
        stateType: 'ACTION_PENDING',
        title: 'Actions pending',
        severity: 'info',
        derivedAt: DERIVED_AT,
      }),
    ]),
    derivedAt: DERIVED_AT,
  }),
  experience: e({
    label: 'WAITING',
    confidenceBand: 'medium',
    stability: 'stable',
    dominantSignals: Object.freeze(['WAITING_REPLY']),
    secondarySignals: Object.freeze(['ACTION_PENDING']),
    suggestedLens: 'neutral',
    explanation: 'You are waiting for a reply. Pending actions are queued.',
    derivedAt: DERIVED_AT,
  }),
  features: Object.freeze([
    f({
      featureId: 'anti-ghosting',
      featureType: 'FOCUS_GUARD',
      title: 'Anti-Ghosting',
      visibility: 'visible',
      priority: 'normal',
      explanation: 'Reduces perceived absence and keeps context visible.',
      appliedMode: 'DEFAULT',
      derivedAt: DERIVED_AT,
    }),
    f({
      featureId: 'smart-inbox-waiting',
      featureType: 'SMART_INBOX',
      title: 'Smart Inbox',
      visibility: 'visible',
      priority: 'normal',
      explanation: 'Inbox is ordered by relevance while waiting.',
      appliedMode: 'DEFAULT',
      derivedAt: DERIVED_AT,
    }),
  ]),
});

const WELLBEING_BLOCKED: DemoScenarioDefinition = Object.freeze({
  id: 'WELLBEING_BLOCKED',
  description: 'Wellbeing block; BLOCKED experience; Wellbeing Gate visible.',
  uxState: s({
    states: Object.freeze([
      st({
        stateId: 'wb-1',
        stateType: 'WELLBEING_BLOCK',
        title: 'Wellbeing block active',
        derivedAt: DERIVED_AT,
      }),
    ]),
    derivedAt: DERIVED_AT,
  }),
  experience: e({
    label: 'BLOCKED',
    confidenceBand: 'high',
    stability: 'stable',
    dominantSignals: Object.freeze(['WELLBEING_BLOCK']),
    secondarySignals: Object.freeze([]),
    suggestedLens: 'wellbeing',
    explanation: 'Wellbeing mode is active. Non-essential interruptions are gated.',
    derivedAt: DERIVED_AT,
  }),
  features: Object.freeze([
    f({
      featureId: 'wellbeing-gate',
      featureType: 'WELLBEING_GATE',
      title: 'Wellbeing Gate',
      visibility: 'visible',
      priority: 'high',
      explanation: 'Only wellbeing-aligned content is shown; other items are gated.',
      appliedMode: 'DEFAULT',
      derivedAt: DERIVED_AT,
    }),
  ]),
});

const NEUTRAL_IDLE: DemoScenarioDefinition = Object.freeze({
  id: 'NEUTRAL_IDLE',
  description: 'No dominant state; IDLE experience; no features or informative-only.',
  uxState: s({
    states: Object.freeze([]),
    derivedAt: DERIVED_AT,
  }),
  experience: e({
    label: 'IDLE',
    confidenceBand: 'medium',
    stability: 'stable',
    dominantSignals: Object.freeze([]),
    secondarySignals: Object.freeze([]),
    suggestedLens: 'neutral',
    explanation: 'No clear experience state available.',
    derivedAt: DERIVED_AT,
  }),
  features: Object.freeze([]),
});

const OVERLOADED: DemoScenarioDefinition = Object.freeze({
  id: 'OVERLOADED',
  description: 'Multiple heterogeneous states; OVERLOADED experience; many low-priority features.',
  uxState: s({
    states: Object.freeze([
      st({
        stateId: 'ov-1',
        stateType: 'ACTION_PENDING',
        title: 'Multiple actions pending',
        severity: 'attention',
        derivedAt: DERIVED_AT,
      }),
      st({
        stateId: 'ov-2',
        stateType: 'SUMMARY_AVAILABLE',
        title: 'Summary available',
        derivedAt: DERIVED_AT,
      }),
      st({
        stateId: 'ov-3',
        stateType: 'SYSTEM_NOTICE',
        title: 'System notice',
        severity: 'info',
        derivedAt: DERIVED_AT,
      }),
    ]),
    derivedAt: DERIVED_AT,
  }),
  experience: e({
    label: 'OVERLOADED',
    confidenceBand: 'low',
    stability: 'volatile',
    dominantSignals: Object.freeze(['ACTION_PENDING', 'SUMMARY_AVAILABLE']),
    secondarySignals: Object.freeze(['SYSTEM_NOTICE']),
    suggestedLens: 'neutral',
    explanation: 'Several signals are present. Experience may feel busy.',
    derivedAt: DERIVED_AT,
  }),
  features: Object.freeze([
    f({
      featureId: 'inbox-overload',
      featureType: 'SMART_INBOX',
      title: 'Smart Inbox',
      visibility: 'reduced',
      priority: 'low',
      explanation: 'Inbox is simplified to reduce overload.',
      appliedMode: 'DEFAULT',
      derivedAt: DERIVED_AT,
    }),
    f({
      featureId: 'guard-overload',
      featureType: 'FOCUS_GUARD',
      title: 'Focus Guard',
      visibility: 'reduced',
      priority: 'low',
      explanation: 'Guard is present but minimized.',
      appliedMode: 'DEFAULT',
      derivedAt: DERIVED_AT,
    }),
    f({
      featureId: 'wellbeing-overload',
      featureType: 'WELLBEING_GATE',
      title: 'Wellbeing Gate',
      visibility: 'reduced',
      priority: 'low',
      explanation: 'Wellbeing gate is available but low priority.',
      appliedMode: 'DEFAULT',
      derivedAt: DERIVED_AT,
    }),
  ]),
});

export const DEMO_SCENARIOS: Record<DemoScenarioId, DemoScenarioDefinition> =
  Object.freeze({
    FOCUS_ACTIVE,
    WAITING_REPLY,
    WELLBEING_BLOCKED,
    NEUTRAL_IDLE,
    OVERLOADED,
  });
