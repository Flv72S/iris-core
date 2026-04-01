/**
 * Phase 16E.X4 — Metric condition evaluation (deterministic).
 */

import type { AlertCondition } from './alert_types.js';

const EPS = 1e-9;

/**
 * Evaluate `value` against rule condition. Returns false if value is not finite.
 */
export function evaluateCondition(value: number, condition: AlertCondition): boolean {
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return false;
  }
  const t = condition.threshold;
  if (!Number.isFinite(t)) {
    return false;
  }
  switch (condition.operator) {
    case '>':
      return value > t;
    case '<':
      return value < t;
    case '>=':
      return value >= t;
    case '<=':
      return value <= t;
    case '==':
      return Math.abs(value - t) < EPS || Object.is(value, t);
    case '!=':
      return !(Math.abs(value - t) < EPS || Object.is(value, t));
    default:
      return false;
  }
}
