import type { ModeTransitionEvent, ModeTransitionStage } from './mode-transition.types';

export function resolveTransitionStage(event: ModeTransitionEvent, now: string): ModeTransitionStage {
  const nowMs = new Date(now).getTime();
  const effectiveMs = new Date(event.effectiveAt).getTime();
  if (Number.isNaN(nowMs) || Number.isNaN(effectiveMs)) return event.stage;
  if (nowMs < effectiveMs) return 'IN_PROGRESS';
  return 'EFFECTIVE';
}
