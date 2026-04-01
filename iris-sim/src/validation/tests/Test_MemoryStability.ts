/**
 * S-0 Enterprise Validation — Test 5: Memory stability under large-scale load.
 * Schedule 1,000,000 lightweight events, run simulation; memory growth must be bounded.
 */

import { DeterministicRuntime } from '../../runtime/DeterministicRuntime.js';
import { createScheduledEvent } from '../../scheduler/ScheduledEvent.js';

const SEED = 'memory-stability-seed';
const N = 1_000_000;
const TICK = 1n;

interface MemorySample {
  heapUsed: number;
  heapTotal: number;
  external?: number;
}

function getMemory(): MemorySample | null {
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
  }
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const m = process.memoryUsage();
    return { heapUsed: m.heapUsed, heapTotal: m.heapTotal, external: m.external };
  }
  return null;
}

function runTest_MemoryStability(): void {
  const before = getMemory();

  const runtime = new DeterministicRuntime();
  runtime.initialize(SEED);
  for (let i = 0; i < N; i++) {
    runtime.scheduler.schedule(
      createScheduledEvent(`mem-${i}`, TICK, 0, () => {}),
    );
  }
  runtime.start();
  runtime.runUntil(TICK + 1n);
  const hash = runtime.getExecutionHash();
  runtime.shutdown();

  const after = getMemory();

  if (hash.length === 0) {
    throw new Error('Memory stability: execution hash empty.');
  }

  if (before && after) {
    const deltaHeap = after.heapUsed - before.heapUsed;
    const threshold = before.heapUsed * 6;
    if (deltaHeap > threshold) {
      throw new Error(
        'Memory stability: heap growth exceeded threshold. Before=' +
          String(before.heapUsed) +
          ', After=' +
          String(after.heapUsed) +
          ', delta=' +
          String(deltaHeap) +
          ', threshold=' +
          String(threshold),
      );
    }
  }
}

export { runTest_MemoryStability };
