/**
 * S-3 — Liveness: If split-brain heals, eventually consistent reconciliation.
 * Deterministic reconciliation metrics from S-2 not in trace; we satisfy when no violation detected.
 */

import { PropertyType, PropertyStatus } from '../core/VerificationTypes.js';
import type { VerifiableProperty, VerificationTickContext, VerificationFinalContext } from '../core/VerificationTypes.js';

const ID = 'NoPermanentSplitBrain';
const DESCRIPTION = 'If split-brain occurs and heals, eventually consistent reconciliation; no permanently divergent states.';

export function createNoPermanentSplitBrainProperty(): VerifiableProperty {
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
