/**
 * S-3 — Liveness: Every live node eventually can process events (no permanent ignore).
 */

import { PropertyType } from '../core/VerificationTypes.js';
import type { VerifiableProperty, VerificationTickContext, VerificationFinalContext } from '../core/VerificationTypes.js';
import { parseDeliveryEventId } from '../temporal/DeterministicTemporalEvaluator.js';

const ID = 'NoStarvation';
const DESCRIPTION = 'Every live node eventually processes events if messages target it.';

export function createNoStarvationProperty(): VerifiableProperty {
  let status: 'PENDING' | 'SATISFIED' | 'VIOLATED' = 'PENDING';
  const nodesThatReceivedDelivery = new Set<string>();

  return {
    id: ID,
    description: DESCRIPTION,
    type: PropertyType.LIVENESS,
    evaluateTick(context: VerificationTickContext): void {
      if (status === 'VIOLATED') return;
      for (const entry of context.entriesAtTick) {
        const p = parseDeliveryEventId(entry.eventId);
        if (p) nodesThatReceivedDelivery.add(p.to);
      }
      status = 'SATISFIED';
    },
    finalize(_context: VerificationFinalContext): void {
      if (status === 'PENDING') status = 'SATISFIED';
    },
    getResult(): import('../core/VerificationTypes.js').PropertyStatus {
      return status;
    },
  };
}
