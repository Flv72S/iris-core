/**
 * S-0 — Random shim. Redirects Math.random to DeterministicRNG.nextFloat.
 */

import type { DeterministicRNG } from '../deterministic-rng/DeterministicRNG.js';

export type RandomProvider = () => number;

export function createRandomShim(rng: DeterministicRNG): RandomProvider {
  return () => rng.nextFloat();
}
