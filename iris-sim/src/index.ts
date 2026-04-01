/**
 * IRIS-Sim S-0 — Deterministic Time & Execution Control.
 * Entry point and minimal example: same scenario + same seed → identical execution hash.
 * Demonstrates: two identical runs → identical hash; snapshot + restore → identical future hash.
 */

import { DeterministicRuntime } from './runtime/DeterministicRuntime.js';
import { createScheduledEvent } from './scheduler/ScheduledEvent.js';

const SEED = 'iris-sim-s0-demo-seed';

function scheduleDemoEvents(
  runtime: DeterministicRuntime,
  counter: { value: number },
): void {
  runtime.scheduler.schedule(
    createScheduledEvent('e1', 1n, 0, () => {
      counter.value++;
    }),
  );
  runtime.scheduler.schedule(
    createScheduledEvent('e2', 1n, 1, () => {
      counter.value += 10;
    }),
  );
  runtime.scheduler.schedule(
    createScheduledEvent('e3', 2n, 0, () => {
      counter.value += 100;
    }),
  );
}

/** Full scenario: init, schedule, start, run until 5n, return hash. */
function runScenario(): string {
  const runtime = new DeterministicRuntime();
  runtime.initialize(SEED);
  const counter = { value: 0 };
  scheduleDemoEvents(runtime, counter);
  runtime.start();
  runtime.runUntil(5n);
  const hash = runtime.getExecutionHash();
  runtime.shutdown();
  return hash;
}

/** Run until tick 2, snapshot, restore, re-schedule same events, run until 5n. Hash must be deterministic. */
function runScenarioWithSnapshotRestore(): string {
  const runtime = new DeterministicRuntime();
  runtime.initialize(SEED);
  const counter = { value: 0 };
  scheduleDemoEvents(runtime, counter);
  runtime.start();
  runtime.runUntil(2n);
  const snap = runtime.snapshot();
  runtime.restore(snap);
  scheduleDemoEvents(runtime, counter);
  runtime.runUntil(5n);
  const hash = runtime.getExecutionHash();
  runtime.shutdown();
  return hash;
}

function main(): void {
  const hash1 = runScenario();
  const hash2 = runScenario();
  const okSameRun = hash1 === hash2 && hash1.length > 0;

  const hashRestore1 = runScenarioWithSnapshotRestore();
  const hashRestore2 = runScenarioWithSnapshotRestore();
  const okRestore = hashRestore1 === hashRestore2 && hashRestore1.length > 0;

  const ok = okSameRun && okRestore;
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write(`Run 1 hash: ${hash1}\n`);
    process.stdout.write(`Run 2 hash: ${hash2}\n`);
    process.stdout.write(`Identical (same scenario): ${okSameRun}\n`);
    process.stdout.write(`Snapshot+restore run 1 hash: ${hashRestore1}\n`);
    process.stdout.write(`Snapshot+restore run 2 hash: ${hashRestore2}\n`);
    process.stdout.write(`Identical (snapshot/restore): ${okRestore}\n`);
    process.exit(ok ? 0 : 1);
  }
}

main();

export { DeterministicRuntime, DeterministicRuntimeError } from './runtime/DeterministicRuntime.js';
export type { RuntimeSnapshot } from './runtime/RuntimeTypes.js';
export { LogicalClock, DeterministicClockError } from './core-time/LogicalClock.js';
export { ClockSnapshot } from './core-time/ClockSnapshot.js';
export type { ClockSnapshotData, SerializedClockSnapshotData } from './core-time/ClockTypes.js';
export { DeterministicScheduler } from './scheduler/DeterministicScheduler.js';
export { createScheduledEvent, DeterministicSchedulerError } from './scheduler/ScheduledEvent.js';
export type { ScheduledEvent, SchedulerSnapshot } from './scheduler/SchedulerTypes.js';
export { DeterministicRNG, DeterministicRNGError } from './deterministic-rng/DeterministicRNG.js';
export type { RNGState } from './deterministic-rng/RNGTypes.js';
export { SandboxGuards, SandboxGuardError } from './sandbox/SandboxGuards.js';
export { ExecutionTrace } from './trace-engine/ExecutionTrace.js';
export { TraceHasher } from './trace-engine/TraceHasher.js';
export type { TraceEntry, TraceExport } from './trace-engine/TraceTypes.js';
export { NondeterministicAsyncError } from './sandbox/AsyncGuard.js';
export * from './sdk/index.js';
export * from './observability/index.js';
export * from './state/index.js';
