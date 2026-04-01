/**
 * S-0 — Deterministic runtime. Wires clock, scheduler, RNG, trace; enables sandbox.
 */

import { LogicalClock } from '../core-time/LogicalClock.js';
import { ClockSnapshot } from '../core-time/ClockSnapshot.js';
import type { SerializedClockSnapshotData } from '../core-time/ClockTypes.js';
import { DeterministicScheduler } from '../scheduler/DeterministicScheduler.js';
import { DeterministicRNG } from '../deterministic-rng/DeterministicRNG.js';
import { ExecutionTrace } from '../trace-engine/ExecutionTrace.js';
import { SandboxGuards } from '../sandbox/SandboxGuards.js';
import type { RuntimeSnapshot } from './RuntimeTypes.js';
import { createHash } from 'crypto';

export class DeterministicRuntimeError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DeterministicRuntimeError';
    Object.setPrototypeOf(this, DeterministicRuntimeError.prototype);
  }
}

export type OnBeforeTickFn = (tick: bigint) => void;

export class DeterministicRuntime {
  readonly clock: LogicalClock;
  readonly scheduler: DeterministicScheduler;
  readonly rng: DeterministicRNG;
  readonly trace: ExecutionTrace;
  private readonly _guards: SandboxGuards;
  private _started = false;
  private _seed: string | null = null;
  private _onBeforeTick: OnBeforeTickFn | null = null;

  constructor() {
    this.clock = new LogicalClock();
    this.scheduler = new DeterministicScheduler();
    this.rng = new DeterministicRNG('');
    this.trace = new ExecutionTrace();
    this._guards = new SandboxGuards();

    this.scheduler.setOnEventExecuted((eventId, _scheduledTick, executionOrderIndex) => {
      const rngHash = createHash('sha256')
        .update(JSON.stringify(this.rng.snapshot()))
        .digest('hex');
      const clockSnap = this.clock.snapshot();
      const clockHash = createHash('sha256')
        .update([String(clockSnap.tick), String(clockSnap.epoch), String(clockSnap.frozenState)].join('\t'))
        .digest('hex');
      this.trace.append({
        tick: String(this.clock.currentTick),
        eventId,
        executionOrderIndex,
        rngStateHash: rngHash,
        clockSnapshotHash: clockHash,
      });
    });
  }

  initialize(seed: string): void {
    if (this._started) {
      throw new DeterministicRuntimeError('ALREADY_STARTED', 'Cannot re-initialize after start.');
    }
    this._seed = seed;
    this.rng.restore(new DeterministicRNG(seed).snapshot());
  }

  start(): void {
    if (this._started) {
      throw new DeterministicRuntimeError('ALREADY_STARTED', 'Runtime already started.');
    }
    if (this._seed === null) {
      throw new DeterministicRuntimeError('NOT_INITIALIZED', 'Call initialize(seed) before start().');
    }
    this._guards.enable(this.clock, this.rng);
    this._started = true;
  }

  setOnBeforeTick(fn: OnBeforeTickFn | null): void {
    this._onBeforeTick = fn;
  }

  /** Run all events at current tick, then advance clock by one. */
  step(): void {
    this.ensureStarted();
    this._onBeforeTick?.(this.clock.currentTick);
    this.scheduler.runUntilTick(this.clock.currentTick);
    this.clock.advanceTick();
  }

  /** Run all events with scheduledTick <= tick and advance clock to tick. */
  runUntil(tick: bigint): void {
    this.ensureStarted();
    while (this.clock.currentTick < tick) {
      this._onBeforeTick?.(this.clock.currentTick);
      this.scheduler.runUntilTick(this.clock.currentTick);
      this.clock.advanceTick();
    }
    this._onBeforeTick?.(this.clock.currentTick);
    this.scheduler.runUntilTick(tick);
  }

  snapshot(): RuntimeSnapshot {
    const traceExport = this.trace.export();
    return Object.freeze({
      clock: this.clock.snapshot(),
      scheduler: this.scheduler.snapshot(),
      rng: this.rng.snapshot(),
      trace: traceExport,
    });
  }

  restore(snap: RuntimeSnapshot): void {
    const clockSnap =
      snap.clock instanceof ClockSnapshot ? snap.clock : ClockSnapshot.fromJSON(snap.clock as SerializedClockSnapshotData);
    this.clock.restore(clockSnap);
    this.rng.restore(snap.rng);
    this.trace.import(snap.trace);
    this.scheduler.clear();
  }

  getExecutionHash(): string {
    return this.trace.computeHash();
  }

  shutdown(): void {
    if (this._started) {
      this._guards.disable();
      this._started = false;
    }
  }

  get isStarted(): boolean {
    return this._started;
  }

  private ensureStarted(): void {
    if (!this._started) {
      throw new DeterministicRuntimeError('NOT_STARTED', 'Call start() before step() or runUntil().');
    }
  }
}
