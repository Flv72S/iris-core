/**
 * Step 6F — Deterministic LCG for stress scenarios. Pure, no external libs.
 * Returns float in [0, 1).
 */

const A = 1664525;
const C = 1013904223;
const M = 2 ** 32;

/**
 * Seeded linear congruential generator. Deterministic for same seed.
 * @returns function that returns next float in [0, 1)
 */
export function privateRandom(seed: number): () => number {
  let state = (seed >>> 0) % M;
  if (state === 0) state = 1;
  return function next(): number {
    state = (A * state + C) >>> 0;
    return state / M;
  };
}
