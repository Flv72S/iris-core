/**
 * S-0 — Logical global clock. Explicit tick advancement only.
 * No Date, no system time. Pure and deterministic.
 */

import { ClockSnapshot } from './ClockSnapshot.js';

export class LogicalClock {
  private _currentTick: bigint = 0n;
  private _currentEpoch: bigint = 0n;
  private _frozen: boolean = false;

  get currentTick(): bigint {
    return this._currentTick;
  }

  get currentEpoch(): bigint {
    return this._currentEpoch;
  }

  get isFrozen(): boolean {
    return this._frozen;
  }

  advanceTick(): void {
    if (this._frozen) {
      throw new DeterministicClockError('CLOCK_FROZEN', 'Tick advancement blocked while clock is frozen.');
    }
    this._currentTick += 1n;
  }

  advanceTicks(n: number): void {
    if (this._frozen) {
      throw new DeterministicClockError('CLOCK_FROZEN', 'Tick advancement blocked while clock is frozen.');
    }
    if (n < 0 || !Number.isInteger(n)) {
      throw new DeterministicClockError('INVALID_TICK_COUNT', 'advanceTicks requires a non-negative integer.');
    }
    this._currentTick += BigInt(n);
  }

  setEpoch(epoch: bigint): void {
    this._currentEpoch = epoch;
  }

  freeze(): void {
    this._frozen = true;
  }

  resume(): void {
    this._frozen = false;
  }

  snapshot(): ClockSnapshot {
    return new ClockSnapshot({
      tick: this._currentTick,
      epoch: this._currentEpoch,
      frozenState: this._frozen,
    });
  }

  restore(snapshot: ClockSnapshot): void {
    const data = snapshot.toJSON();
    this._currentTick = BigInt(data.tick);
    this._currentEpoch = BigInt(data.epoch);
    this._frozen = data.frozenState;
  }
}

export class DeterministicClockError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DeterministicClockError';
    Object.setPrototypeOf(this, DeterministicClockError.prototype);
  }
}
