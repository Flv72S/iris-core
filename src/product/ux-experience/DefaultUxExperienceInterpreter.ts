/**
 * DefaultUxExperienceInterpreter — C.6.5
 * Pura funzione, deterministica, nessun side-effect, nessuna memoria, nessun apprendimento.
 */

import type { UxExperienceInput } from './UxExperienceInput';
import type { UxExperienceState } from './UxExperienceState';
import type { UxExperienceInterpreter } from './UxExperienceInterpreter';
import type { UxExperienceRegistry } from './UxExperienceKillSwitch';
import {
  isUxExperienceEnabled,
  neutralExperienceState,
} from './UxExperienceKillSwitch';

const FOCUS_SIGNALS = ['FOCUS_ACTIVE'];
const WELLBEING_SIGNALS = ['WELLBEING_BLOCK'];
const VOICE_SIGNALS = ['VOICE_READY'];
const WAITING_SIGNALS = ['ACTION_PENDING', 'WAITING_REPLY'];
const BLOCK_SIGNALS = ['DELIVERY_FAILED'];
const SUCCESS_SIGNALS = ['DELIVERY_SUCCESS'];

function countByType(states: readonly { stateType: string }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const s of states) {
    m.set(s.stateType, (m.get(s.stateType) ?? 0) + 1);
  }
  return m;
}

function hasAny(states: readonly { stateType: string }[], types: readonly string[]): boolean {
  const set = new Set(states.map((s) => s.stateType));
  return types.some((t) => set.has(t));
}

function interpretCore(input: UxExperienceInput): UxExperienceState {
  const { snapshot, now } = input;
  const states = snapshot.states;

  if (states.length === 0) {
    return Object.freeze({
      label: 'IDLE',
      confidenceBand: 'high',
      stability: 'stable',
      dominantSignals: Object.freeze([]),
      secondarySignals: Object.freeze([]),
      suggestedLens: 'neutral',
      explanation: 'No active signals; experience is idle.',
      derivedAt: now,
    });
  }

  const counts = countByType(states);
  const signalNames = states.map((s) => s.stateType);

  const hasFocus = hasAny(states, FOCUS_SIGNALS);
  const hasWellbeing = hasAny(states, WELLBEING_SIGNALS);
  const hasVoice = hasAny(states, VOICE_SIGNALS);
  const hasWaiting = hasAny(states, WAITING_SIGNALS);
  const hasBlock = hasAny(states, BLOCK_SIGNALS);
  const hasSuccess = hasAny(states, SUCCESS_SIGNALS);

  if (hasFocus && !hasWellbeing && !hasBlock) {
    return Object.freeze({
      label: 'FOCUSED',
      confidenceBand: 'medium',
      stability: 'stable',
      dominantSignals: Object.freeze([...FOCUS_SIGNALS.filter((t) => counts.has(t))]),
      secondarySignals: Object.freeze(signalNames.filter((t) => !FOCUS_SIGNALS.includes(t))),
      suggestedLens: 'focus',
      explanation: 'Focus mode is active.',
      derivedAt: now,
    });
  }

  if (hasWellbeing) {
    return Object.freeze({
      label: 'BLOCKED',
      confidenceBand: 'medium',
      stability: 'stable',
      dominantSignals: Object.freeze([...WELLBEING_SIGNALS.filter((t) => counts.has(t))]),
      secondarySignals: Object.freeze(signalNames.filter((t) => !WELLBEING_SIGNALS.includes(t))),
      suggestedLens: 'wellbeing',
      explanation: 'Wellbeing or focus gate is limiting actions.',
      derivedAt: now,
    });
  }

  if (hasBlock && !hasSuccess) {
    return Object.freeze({
      label: 'BLOCKED',
      confidenceBand: 'medium',
      stability: 'volatile',
      dominantSignals: Object.freeze([...BLOCK_SIGNALS.filter((t) => counts.has(t))]),
      secondarySignals: Object.freeze(signalNames.filter((t) => !BLOCK_SIGNALS.includes(t))),
      suggestedLens: 'neutral',
      explanation: 'Some deliveries failed or were blocked.',
      derivedAt: now,
    });
  }

  if (hasWaiting && !hasBlock) {
    return Object.freeze({
      label: 'WAITING',
      confidenceBand: 'medium',
      stability: 'stable',
      dominantSignals: Object.freeze([...WAITING_SIGNALS.filter((t) => counts.has(t))]),
      secondarySignals: Object.freeze(signalNames.filter((t) => !WAITING_SIGNALS.includes(t))),
      suggestedLens: 'neutral',
      explanation: 'Actions are pending or waiting for reply.',
      derivedAt: now,
    });
  }

  if (hasVoice && !hasBlock && !hasWellbeing) {
    return Object.freeze({
      label: 'REFLECTIVE',
      confidenceBand: 'medium',
      stability: 'stable',
      dominantSignals: Object.freeze([...VOICE_SIGNALS.filter((t) => counts.has(t))]),
      secondarySignals: Object.freeze(signalNames.filter((t) => !VOICE_SIGNALS.includes(t))),
      suggestedLens: 'voice',
      explanation: 'Voice interaction is ready.',
      derivedAt: now,
    });
  }

  if (hasSuccess && states.length <= 2) {
    return Object.freeze({
      label: 'REFLECTIVE',
      confidenceBand: 'medium',
      stability: 'stable',
      dominantSignals: Object.freeze([...SUCCESS_SIGNALS.filter((t) => counts.has(t))]),
      secondarySignals: Object.freeze(signalNames.filter((t) => !SUCCESS_SIGNALS.includes(t))),
      suggestedLens: 'neutral',
      explanation: 'Recent delivery succeeded.',
      derivedAt: now,
    });
  }

  if (states.length > 3) {
    return Object.freeze({
      label: 'OVERLOADED',
      confidenceBand: 'low',
      stability: 'volatile',
      dominantSignals: Object.freeze(signalNames.slice(0, 2)),
      secondarySignals: Object.freeze(signalNames.slice(2)),
      suggestedLens: 'neutral',
      explanation: 'Multiple signals; experience may be overloaded.',
      derivedAt: now,
    });
  }

  return Object.freeze({
    label: 'NEUTRAL',
    confidenceBand: 'low',
    stability: 'stable',
    dominantSignals: Object.freeze(signalNames.slice(0, 1)),
    secondarySignals: Object.freeze(signalNames.slice(1)),
    suggestedLens: 'neutral',
    explanation: 'Mixed or unclear signals; neutral experience.',
    derivedAt: now,
  });
}

/**
 * Interprete che rispetta il kill-switch: OFF → NEUTRAL con confidence low.
 */
export class DefaultUxExperienceInterpreter implements UxExperienceInterpreter {
  constructor(private readonly registry: UxExperienceRegistry) {}

  interpret(input: UxExperienceInput): UxExperienceState {
    if (!isUxExperienceEnabled(this.registry)) {
      return neutralExperienceState(input.now);
    }
    return interpretCore(input);
  }
}

/**
 * Funzione pura senza registry (per testing deterministico o uso senza kill-switch).
 */
export function interpretUxExperience(input: UxExperienceInput): UxExperienceState {
  return interpretCore(input);
}
