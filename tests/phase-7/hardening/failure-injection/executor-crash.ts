/**
 * Executor Crash — Phase 7.V+ Failure Injection
 */

import type { DomainExecutor } from '../../../../src/core/execution/domain-executors/DomainExecutor';
import type { ActionIntent } from '../../../../src/core/execution/action-intent';
import type { ExecutionResult } from '../../../../src/core/execution/ExecutionResult';

export type ExecutorCrashResult = {
  readonly threw: boolean;
  readonly resultBeforeThrow: ExecutionResult | null;
  readonly auditCoherent: boolean;
  readonly errorMessage: string | null;
};

export function createCrashingExecutor(
  delegate: DomainExecutor,
  crashAfterCall: number
): DomainExecutor {
  let callCount = 0;
  return {
    execute(intent: ActionIntent, now: number): ExecutionResult {
      callCount += 1;
      if (callCount >= crashAfterCall) {
        throw new Error('[Phase 7.V+ injected] Executor crash simulation');
      }
      return delegate.execute(intent, now);
    },
  };
}

export function runExecutorCrashScenario(
  run: () => { result: ExecutionResult; auditSnapshot: readonly { actionId: string; result: ExecutionResult }[] },
  intentId: string
): ExecutorCrashResult {
  let resultBeforeThrow: ExecutionResult | null = null;
  let threw = false;
  let errorMessage: string | null = null;
  try {
    const out = run();
    resultBeforeThrow = out.result;
  } catch (e) {
    threw = true;
    errorMessage = e instanceof Error ? e.message : String(e);
  }
  let auditSnapshot: readonly { actionId: string; result: ExecutionResult }[] = [];
  try {
    const out = run();
    auditSnapshot = out.auditSnapshot;
  } catch {
    // ignore
  }
  const executedForIntent = auditSnapshot.some((e) => e.actionId === intentId && e.result.status === 'EXECUTED');
  const auditCoherent = !executedForIntent || !threw;
  return Object.freeze({ threw, resultBeforeThrow, auditCoherent, errorMessage });
}
