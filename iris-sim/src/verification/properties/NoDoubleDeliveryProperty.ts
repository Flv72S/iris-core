/**
 * S-3 — Safety: No message ID delivered twice to same node.
 */

import { PropertyType } from '../core/VerificationTypes.js';
import type { VerifiableProperty, VerificationTickContext, VerificationFinalContext } from '../core/VerificationTypes.js';
import { deliveryKey } from '../temporal/DeterministicTemporalEvaluator.js';

const ID = 'NoDoubleDelivery';
const DESCRIPTION = 'No delivery event executed twice (same eventId at most once).';

export function createNoDoubleDeliveryProperty(): VerifiableProperty {
  const seenKeys = new Set<string>();
  let status: 'PENDING' | 'SATISFIED' | 'VIOLATED' = 'PENDING';

  return {
    id: ID,
    description: DESCRIPTION,
    type: PropertyType.SAFETY,
    evaluateTick(context: VerificationTickContext): void {
      if (status === 'VIOLATED') return;
      for (const entry of context.entriesAtTick) {
        const key = deliveryKey(entry.eventId);
        if (!key) continue;
        if (seenKeys.has(key)) {
          status = 'VIOLATED';
          return;
        }
        seenKeys.add(key);
      }
      if (context.entriesAtTick.length > 0) status = 'SATISFIED';
    },
    finalize(_context: VerificationFinalContext): void {
      if (status === 'PENDING' && seenKeys.size > 0) status = 'SATISFIED';
    },
    getResult() {
      return status;
    },
  };
}
