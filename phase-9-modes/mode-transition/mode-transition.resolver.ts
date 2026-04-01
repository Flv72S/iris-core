import type { BehaviorMode } from '../definition/mode.types';
import type { ModeTransitionEvent } from './mode-transition.types';
import { MODE_TRANSITION_RULES } from './mode-transition.contract';

function addMsToIso(iso: string, ms: number): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) throw new Error('Invalid initiatedAt ISO string');
  return new Date(t + ms).toISOString();
}

export class ModeTransitionNotAllowedError extends Error {
  constructor(public readonly from: BehaviorMode, public readonly to: BehaviorMode) {
    super('Mode transition from ' + from + ' to ' + to + ' is not allowed.');
    this.name = 'ModeTransitionNotAllowedError';
  }
}

export function resolveModeTransition(
  from: BehaviorMode,
  to: BehaviorMode,
  initiatedAt: string,
  rationale: string
): ModeTransitionEvent {
  if (!rationale || rationale.trim().length === 0) throw new Error('Rationale is required.');
  const rule = MODE_TRANSITION_RULES[from][to];
  if (!rule.allowed) throw new ModeTransitionNotAllowedError(from, to);
  const effectiveAt = addMsToIso(initiatedAt, rule.minimumDurationMs);
  return Object.freeze({ from, to, stage: 'REQUESTED', initiatedAt, effectiveAt, rationale: rationale.trim() });
}
