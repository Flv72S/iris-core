/**
 * S-0 — Time shim. Redirects time APIs to LogicalClock tick.
 */

import type { LogicalClock } from '../core-time/LogicalClock.js';

export type NowProvider = () => number;

export function createTimeShim(clock: LogicalClock): NowProvider {
  return () => Number(clock.currentTick);
}
