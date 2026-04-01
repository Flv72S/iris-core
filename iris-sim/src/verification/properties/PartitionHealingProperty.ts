/**
 * S-3 — Liveness: If partition heals, nodes eventually re-enter connected state.
 */

import { PropertyType, PropertyStatus } from '../core/VerificationTypes.js';
import type { VerifiableProperty, VerificationTickContext, VerificationFinalContext } from '../core/VerificationTypes.js';

const ID = 'PartitionHealing';
const DESCRIPTION = 'If partition heals, nodes eventually re-enter connected state; no permanent isolation.';

export function createPartitionHealingProperty(): VerifiableProperty {
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
