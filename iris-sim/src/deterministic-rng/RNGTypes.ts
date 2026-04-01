/**
 * S-0 — Deterministic RNG type definitions.
 */

export interface RNGState {
  readonly s0: number;
  readonly s1: number;
  readonly callCount: number;
}
