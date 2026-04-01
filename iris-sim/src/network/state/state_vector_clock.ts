/**
 * Phase 14A — State Model Definition. Vector clock utilities.
 */

import type { StateVectorClock } from './state_types.js';

/** Compare vector clocks: returns true if a is strictly after b (every key in b has a[key] >= b[key] and at least one strictly greater). */
export function vectorClockAfter(a: StateVectorClock, b: StateVectorClock): boolean {
  let anyGreater = false;
  for (const node_id of Object.keys(b)) {
    const va = a[node_id] ?? 0;
    const vb = b[node_id] ?? 0;
    if (va < vb) return false;
    if (va > vb) anyGreater = true;
  }
  return anyGreater || Object.keys(a).some((k) => (b[k] ?? 0) < (a[k] ?? 0));
}

/** Merge two vector clocks (pointwise max). Deterministic. */
export function mergeVectorClocks(a: StateVectorClock, b: StateVectorClock): StateVectorClock {
  const out: StateVectorClock = { ...a };
  for (const node_id of Object.keys(b)) {
    const current = out[node_id] ?? 0;
    const other = b[node_id] ?? 0;
    out[node_id] = Math.max(current, other);
  }
  return out;
}

/** Sorted keys for deterministic serialization. */
export function vectorClockKeys(clock: StateVectorClock): string[] {
  return Object.keys(clock).sort((x, y) => x.localeCompare(y));
}
