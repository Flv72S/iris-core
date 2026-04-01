/**
 * S-0 — Deterministic RNG. xorshift128+ style, no Math.random().
 * Same seed → same sequence. Snapshot/restore for replay.
 */

import type { RNGState } from './RNGTypes.js';

function stringSeedToState(seed: string): { s0: number; s1: number } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  let s0 = (h >>> 0) || 1;
  let s1 = (h * 0x9e3779b9) >>> 0 || 1;
  for (let i = 0; i < 4; i++) {
    s0 = xorshift32(s0);
    s1 = xorshift32(s1);
  }
  return { s0, s1 };
}

function xorshift32(x: number): number {
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}

export class DeterministicRNGError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DeterministicRNGError';
    Object.setPrototypeOf(this, DeterministicRNGError.prototype);
  }
}

export class DeterministicRNG {
  private _s0: number;
  private _s1: number;
  private _callCount: number = 0;

  constructor(seed: string) {
    if (typeof seed !== 'string') {
      throw new DeterministicRNGError('INVALID_SEED', 'Seed must be a string.');
    }
    const { s0, s1 } = stringSeedToState(seed);
    this._s0 = s0;
    this._s1 = s1;
  }

  /** Next 32-bit unsigned. Internal xorshift128+ style step. */
  nextUint32(): number {
    this._callCount++;
    let s0 = this._s0;
    let s1 = this._s1;
    const r = (s0 + s1) >>> 0;
    s1 ^= s0;
    this._s0 = xorshift32(s0);
    this._s1 = xorshift32(s1);
    this._s0 = (this._s0 ^ (this._s0 << 23) ^ s1 ^ (s1 >>> 18)) >>> 0;
    this._s1 = (s1 << 11) >>> 0;
    return r;
  }

  nextFloat(): number {
    return this.nextUint32() / 0x1_0000_0000;
  }

  /** [0, max) exclusive. max must be positive. */
  nextInt(max: number): number {
    if (typeof max !== 'number' || max <= 0 || !Number.isInteger(max)) {
      throw new DeterministicRNGError('INVALID_MAX', 'nextInt(max) requires a positive integer.');
    }
    const u = this.nextUint32();
    return (u % max) >>> 0;
  }

  snapshot(): RNGState {
    return Object.freeze({
      s0: this._s0,
      s1: this._s1,
      callCount: this._callCount,
    });
  }

  restore(state: RNGState): void {
    this._s0 = state.s0;
    this._s1 = state.s1;
    this._callCount = state.callCount;
  }

  get callCount(): number {
    return this._callCount;
  }
}
