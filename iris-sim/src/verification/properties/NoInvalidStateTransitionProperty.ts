/**
 * S-3 — Safety: No invalid trace ordering (monotonic tick, valid execution order).
 */

import { PropertyType, PropertyStatus } from '../core/VerificationTypes.js';
import type { VerifiableProperty, VerificationTickContext, VerificationFinalContext } from '../core/VerificationTypes.js';

const ID = 'NoInvalidStateTransition';
const DESCRIPTION = 'Trace has monotonic ticks and non-decreasing execution order within tick.';

export function createNoInvalidStateTransitionProperty(): VerifiableProperty {
  let status: 'PENDING' | 'SATISFIED' | 'VIOLATED' = 'PENDING';
  let lastTick = -1n;
  let lastExecutionOrderIndex = -1;

  return {
    id: ID,
    description: DESCRIPTION,
    type: PropertyType.SAFETY,
    evaluateTick(context: VerificationTickContext): void {
      if (status === 'VIOLATED') return;
      const t = context.tick;
      if (t < lastTick) {
        status = 'VIOLATED';
        return;
      }
      lastTick = t;
      const entries = [...context.entriesAtTick].sort((a, b) => a.executionOrderIndex - b.executionOrderIndex);
      for (const e of entries) {
        if (e.executionOrderIndex <= lastExecutionOrderIndex) {
          status = 'VIOLATED';
          return;
        }
        lastExecutionOrderIndex = e.executionOrderIndex;
      }
      if (context.entriesAtTick.length > 0) status = 'SATISFIED';
    },
    finalize(_context: VerificationFinalContext): void {
      if (status === 'PENDING') status = 'SATISFIED';
    },
    getResult(): typeof PropertyStatus[keyof typeof PropertyStatus] {
      return status as typeof PropertyStatus[keyof typeof PropertyStatus];
    },
  };
}
