import { DeterministicRuntime } from '../../runtime/DeterministicRuntime.js';
import { createScheduledEvent } from '../../scheduler/ScheduledEvent.js';

const SEED = 'scheduler-stability-seed';
const N = 100000;
const TICK = 1n;
const PRIORITY = 0;

function runTest_SchedulerStability(): void {
  const run1 = captureExecutionOrder();
  const run2 = captureExecutionOrder();
  if (run1.length !== N || run2.length !== N) {
    throw new Error('Scheduler: expected ' + N + ' events, got ' + run1.length + ' and ' + run2.length);
  }
  for (let i = 0; i < N; i++) {
    if (run1[i] !== run2[i]) throw new Error('Scheduler: order differs at index ' + i);
  }
  if (new Set(run1).size !== N || new Set(run2).size !== N) {
    throw new Error('Scheduler: duplicate or missing event ids');
  }
}

function captureExecutionOrder(): string[] {
  const order: string[] = [];
  const runtime = new DeterministicRuntime();
  runtime.initialize(SEED);
  for (let i = 0; i < N; i++) {
    const id = 'ev-' + i;
    runtime.scheduler.schedule(createScheduledEvent(id, TICK, PRIORITY, () => order.push(id)));
  }
  runtime.start();
  runtime.runUntil(TICK + 1n);
  runtime.shutdown();
  return order;
}

export { runTest_SchedulerStability };
