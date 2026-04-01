/**
 * S-0 Enterprise Validation — Runner. Executes all certification tests sequentially.
 */

import { runTest_NondeterminismLeakage } from './tests/Test_NondeterminismLeakage.js';
import { runTest_SchedulerStability } from './tests/Test_SchedulerStability.js';
import { runTest_RNGSnapshotIntegrity } from './tests/Test_RNGSnapshotIntegrity.js';
import { runTest_TraceHashPortability } from './tests/Test_TraceHashPortability.js';
import { runTest_MemoryStability } from './tests/Test_MemoryStability.js';

const BANNER = '---------------------------------------';
const HEADER = 'S-0 ENTERPRISE VALIDATION RESULTS';

function write(s: string): void {
  if (typeof process !== 'undefined' && process.stdout) {
    process.stdout.write(s);
  }
}

function main(): void {
  write(BANNER + '\n');
  write(HEADER + '\n');
  write(BANNER + '\n');

  const tests: { name: string; run: () => void }[] = [
    { name: 'Test 1: Nondeterminism Leakage', run: runTest_NondeterminismLeakage },
    { name: 'Test 2: Scheduler Stability', run: runTest_SchedulerStability },
    { name: 'Test 3: RNG Snapshot Integrity', run: runTest_RNGSnapshotIntegrity },
    { name: 'Test 4: Trace Hash Portability', run: runTest_TraceHashPortability },
    { name: 'Test 5: Memory Stability', run: runTest_MemoryStability },
  ];

  for (const { name, run } of tests) {
    try {
      run();
      write(name + ': PASS\n');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      write(name + ': FAIL\n');
      write('  Error: ' + message + '\n');
      if (err instanceof Error && err.stack) {
        write('  ' + err.stack.split('\n').slice(1, 3).join('\n  ') + '\n');
      }
      write(BANNER + '\n');
      process.exit(1);
    }
  }

  write(BANNER + '\n');
  write('CERTIFIED\n');
  process.exit(0);
}

main();
