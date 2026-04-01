/**
 * Stability Step 2 — Sandbox metrics aggregation.
 * collectSandboxMetrics, mergeSandboxMetrics; total/active/suspended, budgetViolations, averageExecutionTime.
 */

import type { SandboxMetrics } from './sandboxTypes.js';

export interface AggregatedSandboxMetrics {
  readonly totalSandboxes: number;
  readonly activeSandboxes: number;
  readonly suspendedSandboxes: number;
  readonly terminatedSandboxes: number;
  readonly totalBudgetViolations: number;
  readonly averageExecutionTime: number;
}

export function collectSandboxMetrics(
  perSandbox: Map<string, SandboxMetrics>,
  statuses: Map<string, 'active' | 'suspended' | 'terminated'>
): AggregatedSandboxMetrics {
  let active = 0;
  let suspended = 0;
  let terminated = 0;
  let totalViolations = 0;
  let totalTime = 0;
  let executionCount = 0;
  for (const [, m] of perSandbox) {
    totalViolations += m.budgetViolations;
    totalTime += m.averageExecutionTime * m.executions;
    executionCount += m.executions;
  }
  for (const s of statuses.values()) {
    if (s === 'active') active++;
    else if (s === 'suspended') suspended++;
    else terminated++;
  }
  const total = perSandbox.size;
  return Object.freeze({
    totalSandboxes: total,
    activeSandboxes: active,
    suspendedSandboxes: suspended,
    terminatedSandboxes: terminated,
    totalBudgetViolations: totalViolations,
    averageExecutionTime: executionCount > 0 ? totalTime / executionCount : 0,
  });
}

export function mergeSandboxMetrics(
  a: AggregatedSandboxMetrics,
  b: AggregatedSandboxMetrics
): AggregatedSandboxMetrics {
  const total = a.totalSandboxes + b.totalSandboxes;
  const avg =
    total > 0
      ? (a.averageExecutionTime * a.totalSandboxes + b.averageExecutionTime * b.totalSandboxes) /
        total
      : 0;
  return Object.freeze({
    totalSandboxes: total,
    activeSandboxes: a.activeSandboxes + b.activeSandboxes,
    suspendedSandboxes: a.suspendedSandboxes + b.suspendedSandboxes,
    terminatedSandboxes: a.terminatedSandboxes + b.terminatedSandboxes,
    totalBudgetViolations: a.totalBudgetViolations + b.totalBudgetViolations,
    averageExecutionTime: avg,
  });
}
