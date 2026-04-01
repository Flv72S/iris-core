/**
 * Deep Structural Compare — Phase 7.V+
 *
 * Confronto ricorsivo di execution result, audit snapshot, metadata.
 */

import type { ExecutionResult } from '../../../../src/core/execution/ExecutionResult';
import type { ExecutionAuditEntry } from '../../../../src/core/execution/audit/ExecutionAuditLog';

export type StructuralDiff = {
  readonly path: string;
  readonly expected: unknown;
  readonly actual: unknown;
};

export function compareExecutionResults(
  a: ExecutionResult,
  b: ExecutionResult
): StructuralDiff | null {
  if (a.status !== b.status) {
    return { path: 'status', expected: a.status, actual: b.status };
  }
  if (a.status === 'EXECUTED' && b.status === 'EXECUTED') {
    if (a.executedAt !== b.executedAt) {
      return { path: 'executedAt', expected: a.executedAt, actual: b.executedAt };
    }
    return null;
  }
  if ((a.status === 'SKIPPED' || a.status === 'BLOCKED') && (b.status === 'SKIPPED' || b.status === 'BLOCKED')) {
    if (a.reason !== b.reason) {
      return { path: 'reason', expected: a.reason, actual: b.reason };
    }
    return null;
  }
  return null;
}

export function compareAuditEntries(
  a: ExecutionAuditEntry,
  b: ExecutionAuditEntry,
  index: number
): StructuralDiff | null {
  if (a.actionId !== b.actionId) {
    return { path: `[${index}].actionId`, expected: a.actionId, actual: b.actionId };
  }
  if (a.type !== b.type) {
    return { path: `[${index}].type`, expected: a.type, actual: b.type };
  }
  if (a.sourceFeature !== b.sourceFeature) {
    return { path: `[${index}].sourceFeature`, expected: a.sourceFeature, actual: b.sourceFeature };
  }
  if (a.requestedAt !== b.requestedAt) {
    return { path: `[${index}].requestedAt`, expected: a.requestedAt, actual: b.requestedAt };
  }
  const resultDiff = compareExecutionResults(a.result, b.result);
  if (resultDiff != null) {
    return {
      path: `[${index}].result.${resultDiff.path}`,
      expected: resultDiff.expected,
      actual: resultDiff.actual,
    };
  }
  return null;
}

export function compareAuditSnapshots(
  expected: readonly ExecutionAuditEntry[],
  actual: readonly ExecutionAuditEntry[]
): StructuralDiff | null {
  if (expected.length !== actual.length) {
    return { path: 'length', expected: expected.length, actual: actual.length };
  }
  for (let i = 0; i < expected.length; i++) {
    const d = compareAuditEntries(expected[i]!, actual[i]!, i);
    if (d != null) return d;
  }
  return null;
}

export function compareShallowObject(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  pathPrefix: string = ''
): StructuralDiff | null {
  const keysExpected = Object.keys(expected).sort();
  const keysActual = Object.keys(actual).sort();
  if (keysExpected.length !== keysActual.length) {
    return { path: `${pathPrefix}keys`, expected: keysExpected, actual: keysActual };
  }
  for (const k of keysExpected) {
    if (!(k in actual)) {
      return { path: `${pathPrefix}${k}`, expected: expected[k], actual: undefined };
    }
    const ve = expected[k];
    const va = actual[k];
    if (ve !== va && (typeof ve !== 'object' || typeof va !== 'object' || ve === null || va === null)) {
      return { path: `${pathPrefix}${k}`, expected: ve, actual: va };
    }
  }
  return null;
}
