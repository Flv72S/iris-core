import type { BehaviorMode } from '../definition/mode.types';

export interface ModeTransitionRule {
  readonly allowed: boolean;
  readonly minimumDurationMs: number;
}

export const MODE_TRANSITION_RULES: Record<BehaviorMode, Record<BehaviorMode, ModeTransitionRule>> = Object.freeze({
  DEFAULT: {
    DEFAULT: Object.freeze({ allowed: true, minimumDurationMs: 0 }),
    FOCUS: Object.freeze({ allowed: true, minimumDurationMs: 30000 }),
    WELLBEING: Object.freeze({ allowed: true, minimumDurationMs: 60000 }),
  },
  FOCUS: {
    DEFAULT: Object.freeze({ allowed: true, minimumDurationMs: 30000 }),
    FOCUS: Object.freeze({ allowed: true, minimumDurationMs: 0 }),
    WELLBEING: Object.freeze({ allowed: true, minimumDurationMs: 60000 }),
  },
  WELLBEING: {
    DEFAULT: Object.freeze({ allowed: true, minimumDurationMs: 60000 }),
    FOCUS: Object.freeze({ allowed: false, minimumDurationMs: 0 }),
    WELLBEING: Object.freeze({ allowed: true, minimumDurationMs: 0 }),
  },
});
