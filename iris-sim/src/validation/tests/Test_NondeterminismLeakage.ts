import { DeterministicRuntime } from '../../runtime/DeterministicRuntime.js';
import { createScheduledEvent } from '../../scheduler/ScheduledEvent.js';
import { NondeterministicAsyncError } from '../../sandbox/AsyncGuard.js';

const SEED = 'nondet-leakage-test-seed';

function errCode(e: unknown): string {
  if (e instanceof NondeterministicAsyncError) return e.code;
  if (e instanceof Error) return e.name;
  return String(e);
}

function runTest_NondeterminismLeakage(): void {
  const runtime = new DeterministicRuntime();
  runtime.initialize(SEED);
  const results: string[] = [];

  runtime.scheduler.schedule(
    createScheduledEvent('nondet-probe', 1n, 0, () => {
      try {
        results[0] = typeof Date.now() === 'number' ? 'SHIMMED' : 'REAL';
      } catch (e) {
        results[0] = errCode(e);
      }
      try {
        const r = Math.random();
        results[1] = typeof r === 'number' && r >= 0 && r < 1 ? 'SHIMMED' : 'REAL';
      } catch (e) {
        results[1] = errCode(e);
      }
      try {
        Promise.resolve().then(() => {});
        results[2] = 'RAN';
      } catch (e) {
        results[2] = errCode(e);
      }
      try {
        setTimeout(() => {}, 0);
        results[3] = 'RAN';
      } catch (e) {
        results[3] = errCode(e);
      }
      try {
        const u = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'NO_CRYPTO';
        results[4] = typeof u === 'string' && u.length === 36 ? 'SHIMMED_OR_REAL' : String(u);
      } catch (e) {
        results[4] = errCode(e);
      }
    }),
  );
  runtime.start();
  runtime.runUntil(2n);
  runtime.shutdown();

  if (results[0] !== 'SHIMMED') throw new Error('Test 1A: expected SHIMMED');
  if (results[1] !== 'SHIMMED') throw new Error('Test 1B: expected SHIMMED');
  if (results[2] !== 'UNSCHEDULED_PROMISE') throw new Error('Test 1C: expected UNSCHEDULED_PROMISE');
  if (results[3] !== 'UNSCHEDULED_ASYNC') throw new Error('Test 1D: expected UNSCHEDULED_ASYNC');
  if (results[4] !== 'SHIMMED_OR_REAL') throw new Error('Test 1E: expected SHIMMED_OR_REAL');
}

export { runTest_NondeterminismLeakage };
