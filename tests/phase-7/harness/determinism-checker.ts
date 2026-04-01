/**
 * Determinism Checker — Phase 7.V
 *
 * Esegue N run dello stesso test, confronta tutti gli output, fallisce se esiste divergenza.
 */

import type { ExecutionHarnessInput } from './execution-harness';
import { runExecutionHarness } from './execution-harness';
import type { ExecutionResult } from '../../../src/core/execution/ExecutionResult';

export type DeterminismRunResult = {
  readonly runIndex: number;
  readonly result: ExecutionResult;
  readonly auditLength: number;
};

export type DeterminismReport = {
  readonly identical: boolean;
  readonly runs: number;
  readonly firstResult: ExecutionResult;
  readonly firstAuditLength: number;
  readonly divergence?: { runIndex: number; diff: unknown };
};

/**
 * Esegue N run con lo stesso input (senza idempotency per il primo run solo, poi con store pulito per evitare SKIPPED per idempotenza).
 * Per determinismo puro ogni run deve usare idempotencyStore vuoto e stessi input → stesso result.
 */
export function runDeterminismCheck(
  input: ExecutionHarnessInput,
  runs: number = 5
): DeterminismReport {
  const outputs: DeterminismRunResult[] = [];

  for (let i = 0; i < runs; i++) {
    const out = runExecutionHarness(input);
    outputs.push({
      runIndex: i,
      result: out.result,
      auditLength: out.auditSnapshot.length,
    });
  }

  const first = outputs[0];
  if (first == null) {
    return {
      identical: true,
      runs: 0,
      firstResult: Object.freeze({ status: 'BLOCKED', reason: 'No runs' }),
      firstAuditLength: 0,
    };
  }

  for (let i = 1; i < outputs.length; i++) {
    const curr = outputs[i]!;
    if (curr.result.status !== first.result.status) {
      return Object.freeze({
        identical: false,
        runs,
        firstResult: first.result,
        firstAuditLength: first.auditLength,
        divergence: {
          runIndex: i,
          diff: { kind: 'status', first: first.result.status, current: curr.result.status },
        },
      });
    }
    if (curr.result.status === 'EXECUTED' && first.result.status === 'EXECUTED') {
      if (curr.result.executedAt !== first.result.executedAt) {
        return Object.freeze({
          identical: false,
          runs,
          firstResult: first.result,
          firstAuditLength: first.auditLength,
          divergence: {
            runIndex: i,
            diff: { kind: 'executedAt', first: first.result.executedAt, current: curr.result.executedAt },
          },
        });
      }
    }
    if (curr.auditLength !== first.auditLength) {
      return Object.freeze({
        identical: false,
        runs,
        firstResult: first.result,
        firstAuditLength: first.auditLength,
        divergence: {
          runIndex: i,
          diff: { kind: 'auditLength', first: first.auditLength, current: curr.auditLength },
        },
      });
    }
  }

  return Object.freeze({
    identical: true,
    runs,
    firstResult: first.result,
    firstAuditLength: first.auditLength,
  });
}
