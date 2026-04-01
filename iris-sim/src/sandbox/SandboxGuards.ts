/**
 * S-0 — Sandbox guards. Enable/disable deterministic shims; block nondeterministic APIs.
 */

import type { LogicalClock } from '../core-time/LogicalClock.js';
import type { DeterministicRNG } from '../deterministic-rng/DeterministicRNG.js';
import { createTimeShim } from './TimeShim.js';
import { createRandomShim } from './RandomShim.js';
import {
  createBlockingTimerShim,
  createBlockingIntervalShim,
  type TimerShim,
  type IntervalShim,
  throwPromise,
} from './AsyncGuard.js';

export class SandboxGuardError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SandboxGuardError';
    Object.setPrototypeOf(this, SandboxGuardError.prototype);
  }
}

interface StoredGlobals {
  DateNow: typeof Date.now;
  MathRandom: typeof Math.random;
  SetTimeout: typeof setTimeout;
  SetInterval: typeof setInterval;
  ProcessHrtime: ((time?: [number, number]) => [number, number]) | undefined;
  CryptoRandomUUID: (() => string) | undefined;
  PromiseThen: typeof Promise.prototype.then;
}

const STORAGE_KEY = '__iris_sim_sandbox_storage';

function getStorage(): StoredGlobals | null {
  return (globalThis as unknown as Record<string, StoredGlobals | null>)[STORAGE_KEY] ?? null;
}

function setStorage(s: StoredGlobals | null): void {
  (globalThis as unknown as Record<string, StoredGlobals | null>)[STORAGE_KEY] = s;
}

function captureGlobals(): StoredGlobals {
  return {
    DateNow: Date.now,
    MathRandom: Math.random,
    SetTimeout: setTimeout,
    SetInterval: setInterval,
    ProcessHrtime: typeof process !== 'undefined' ? process.hrtime : undefined,
    CryptoRandomUUID:
      typeof globalThis.crypto !== 'undefined' && typeof (globalThis.crypto as { randomUUID?: () => string }).randomUUID === 'function'
        ? (globalThis.crypto as { randomUUID: () => string }).randomUUID.bind(globalThis.crypto)
        : undefined,
    PromiseThen: Promise.prototype.then,
  };
}

function restoreGlobals(stored: StoredGlobals): void {
  Date.now = stored.DateNow;
  Math.random = stored.MathRandom;
  globalThis.setTimeout = stored.SetTimeout as typeof setTimeout;
  globalThis.setInterval = stored.SetInterval as typeof setInterval;
  if (typeof process !== 'undefined' && stored.ProcessHrtime) {
    (process as { hrtime: (time?: [number, number]) => [number, number] }).hrtime = stored.ProcessHrtime;
  }
  if (globalThis.crypto && stored.CryptoRandomUUID) {
    (globalThis.crypto as { randomUUID: () => string }).randomUUID = stored.CryptoRandomUUID;
  }
  if (stored.PromiseThen) {
    Promise.prototype.then = stored.PromiseThen;
  }
}

export class SandboxGuards {
  private _enabled = false;

  enable(clock: LogicalClock, rng: DeterministicRNG): void {
    if (this._enabled) {
      throw new SandboxGuardError('ALREADY_ENABLED', 'Sandbox is already enabled.');
    }
    const stored = captureGlobals();
    setStorage(stored);

    const timeShim = createTimeShim(clock);
    const randomShim = createRandomShim(rng);
    const timerShim: TimerShim = createBlockingTimerShim();
    const intervalShim: IntervalShim = createBlockingIntervalShim();

    Date.now = timeShim;
    Math.random = randomShim;
    globalThis.setTimeout = timerShim as unknown as typeof setTimeout;
    globalThis.setInterval = intervalShim as unknown as typeof setInterval;

    if (typeof process !== 'undefined' && process.hrtime) {
      const shim = () => {
        const tick = Number(clock.currentTick);
        return [Math.floor(tick / 1e9), (tick % 1e9) | 0] as [number, number];
      };
      (process.hrtime as unknown as { (time?: [number, number]): [number, number] }) = shim;
    }

    if (typeof globalThis.crypto !== 'undefined' && (globalThis.crypto as { randomUUID?: unknown }).randomUUID) {
      const uuidShim = () => {
        const h = '0123456789abcdef';
        let s = '';
        for (let i = 0; i < 36; i++) {
          if (i === 8 || i === 13 || i === 18 || i === 23) s += '-';
          else if (i === 14) s += '4';
          else s += h[rng.nextInt(16)];
        }
        return s as `${string}-${string}-${string}-${string}-${string}`;
      };
      (globalThis.crypto as { randomUUID: () => string }).randomUUID = uuidShim;
    }

    (Promise.prototype as unknown as { then: (a?: unknown, b?: unknown) => Promise<never> }).then = function (): never {
      throwPromise();
    };

    this._enabled = true;
  }

  disable(): void {
    if (!this._enabled) return;
    const stored = getStorage();
    if (stored) {
      restoreGlobals(stored);
      setStorage(null);
    }
    this._enabled = false;
  }

  get isEnabled(): boolean {
    return this._enabled;
  }
}
