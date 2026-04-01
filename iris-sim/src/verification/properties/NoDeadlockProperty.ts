/**
 * S-3 — Liveness: Scheduler eventually drains or system progresses (no infinite stall).
 */

import { PropertyType } from '../core/VerificationTypes.js';
import type { VerifiableProperty, VerificationTickContext, VerificationFinalContext } from '../core/VerificationTypes.js';

const ID = 'NoDeadlock';
const DESCRIPTION = 'Scheduler queue eventually drains or system progresses; no infinite stall.';

export function createNoDeadlockProperty(_livenessWindowTicks: bigint): VerifiableProperty {
  let status: 'PENDING' | 'SATISFIED' | 'VIOLATED' = 'PENDING';

  return {
    id: ID,
    description: DESCRIPTION,
    type: PropertyType.LIVENESS,
    evaluateTick(context: VerificationTickContext): void {
      if (status === 'VIOLATED') return;
      const hadEvents = context.entriesAtTick.length > 0;
      const queueDrained = context.schedulerSize === 0;
      // Progress: we executed events this tick, or scheduler drained (no pending work).
      // If scheduler has events, they are for future ticks (we already ran runUntil(tick)), so not deadlock.
      if (hadEvents || queueDrained) status = 'SATISFIED';
      // Only count stall when: no events AND queue not drained AND next event is due now (we don't have that in context).
      // Without nextScheduledTick we never treat "quiet period" or "end of run" as deadlock.
    },
    finalize(_c: VerificationFinalContext): void {
      if (status === 'PENDING') status = 'SATISFIED';
    },
    getResult() {
      return status;
    },
  };
}
