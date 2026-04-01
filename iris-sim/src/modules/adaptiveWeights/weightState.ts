/**
 * Stability Step 5A — Adaptive weight state.
 * Simple weight structure and bounds validation. No business logic.
 */

export interface WeightState {
  readonly weightA: number;
  readonly weightB: number;
  readonly weightC: number;
}

const MIN_WEIGHT = 0.5;
const MAX_WEIGHT = 2.0;

export function createInitialWeightState(): WeightState {
  return Object.freeze({ weightA: 1, weightB: 1, weightC: 1 });
}

export function validateWeightBounds(value: number): boolean {
  return value >= MIN_WEIGHT && value <= MAX_WEIGHT;
}
