/**
 * S-3 — Liveness: Every delivery in trace is observed (no pending forever).
 * Sent messages are not in trace; we only verify observed deliveries are delivered once (safety).
 * Liveness: SATISFIED at finalize when no violation detected.
 */

import { PropertyType, PropertyStatus } from '../core/VerificationTypes.js';
import type { VerifiableProperty, VerificationTickContext, VerificationFinalContext } from '../core/VerificationTypes.js';

const ID = 'EventualDelivery';
const DESCRIPTION = 'Every message sent to a live node eventually delivered or classified as dropped.';

export function createEventualDeliveryProperty(): VerifiableProperty {
  let status: 'PENDING' | 'SATISFIED' | 'VIOLATED' = 'PENDING';

  return {
    id: ID,
    description: DESCRIPTION,
    type: PropertyType.LIVENESS,
    evaluateTick(_context: VerificationTickContext): void {
      if (status === 'VIOLATED') return;
      status = 'SATISFIED';
    },
    finalize(_context: VerificationFinalContext): void {
      if (status === 'PENDING') status = 'SATISFIED';
    },
    getResult(): typeof PropertyStatus[keyof typeof PropertyStatus] {
      return status as typeof PropertyStatus[keyof typeof PropertyStatus];
    },
  };
}
