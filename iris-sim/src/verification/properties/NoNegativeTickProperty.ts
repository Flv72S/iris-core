/**
 * S-3 — Safety: Monotonic non-negative tick progression.
 */

import { PropertyType, PropertyStatus } from '../core/VerificationTypes.js';
import type { VerifiableProperty, VerificationTickContext, VerificationFinalContext } from '../core/VerificationTypes.js';

const ID = 'NoNegativeTick';
const DESCRIPTION = 'Tick progression is non-negative and monotonic.';

export function createNoNegativeTickProperty(): VerifiableProperty {
  let status: 'PENDING' | 'SATISFIED' | 'VIOLATED' = 'PENDING';
  let lastTick = -1n;

  return {
    id: ID,
    description: DESCRIPTION,
    type: PropertyType.SAFETY,
    evaluateTick(context: VerificationTickContext): void {
      if (status === 'VIOLATED') return;
      if (context.tick < 0n) {
        status = 'VIOLATED';
        return;
      }
      if (context.tick < lastTick) {
        status = 'VIOLATED';
        return;
      }
      lastTick = context.tick;
      if (context.tick >= 0n) status = 'SATISFIED';
    },
    finalize(_context: VerificationFinalContext): void {
      if (status === 'PENDING') status = 'SATISFIED';
    },
    getResult(): typeof PropertyStatus[keyof typeof PropertyStatus] {
      return status as typeof PropertyStatus[keyof typeof PropertyStatus];
    },
  };
}
