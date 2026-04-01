/**
 * S-0 Enterprise Validation — Test 4: Trace hash portability safety.
 */

import { DeterministicRuntime } from '../../runtime/DeterministicRuntime.js';
import { createScheduledEvent } from '../../scheduler/ScheduledEvent.js';
import { ClockSnapshot } from '../../core-time/ClockSnapshot.js';

const SEED = 'trace-hash-portability-seed';

function runTest_TraceHashPortability(): void {
  const hash1 = runFixedScenario();
  const hash2 = runFixedScenario();
  if (hash1 !== hash2) {
    throw new Error('Trace hash portability: identical runs produced different hashes.');
  }

  const hashAfterRestore1 = runSnapshotRestoreScenario();
  const hashAfterRestore2 = runSnapshotRestoreScenario();
  if (hashAfterRestore1 !== hashAfterRestore2) {
    throw new Error('Trace hash portability: snapshot/restore runs produced different hashes.');
  }
}

function runFixedScenario(): string {
  const runtime = new DeterministicRuntime();
  runtime.initialize(SEED);
  runtime.scheduler.schedule(createScheduledEvent('a', 1n, 0, () => {}));
  runtime.scheduler.schedule(createScheduledEvent('b', 1n, 1, () => {}));
  runtime.scheduler.schedule(createScheduledEvent('c', 2n, 0, () => {}));
  runtime.start();
  runtime.runUntil(5n);
  const hash = runtime.getExecutionHash();
  runtime.shutdown();
  return hash;
}

function runSnapshotRestoreScenario(): string {
  const runtime = new DeterministicRuntime();
  runtime.initialize(SEED);
  runtime.scheduler.schedule(createScheduledEvent('x', 1n, 0, () => {}));
  runtime.scheduler.schedule(createScheduledEvent('y', 2n, 0, () => {}));
  runtime.start();
  runtime.runUntil(2n);
  const snap = runtime.snapshot();
  const clockData = snap.clock instanceof ClockSnapshot ? snap.clock.toJSON() : snap.clock;
  const serialized = JSON.stringify({
    clock: clockData,
    scheduler: snap.scheduler,
    rng: snap.rng,
    trace: snap.trace,
  });
  const parsed = JSON.parse(serialized);
  runtime.restore({
    clock: parsed.clock,
    scheduler: parsed.scheduler,
    rng: parsed.rng,
    trace: parsed.trace,
  });
  runtime.scheduler.schedule(createScheduledEvent('z', 3n, 0, () => {}));
  runtime.runUntil(5n);
  const hash = runtime.getExecutionHash();
  runtime.shutdown();
  return hash;
}

export { runTest_TraceHashPortability };
