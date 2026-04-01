/**
 * Global Abort — Se sistema in WELLBEING_BLOCKED → BLOCKED.
 */

import type { ExecutionAction } from '../ExecutionAction';
import type { ExecutionContext } from '../ExecutionContext';
import type { ExecutionResult } from '../ExecutionResult';
import type { ExecutionGuardrail } from './ExecutionGuardrail';

export const wellbeingBlockGuardrail: ExecutionGuardrail = {
  id: 'wellbeing-block',
  check(_action: ExecutionAction, context: ExecutionContext): ExecutionResult | null {
    if (context.wellbeingBlocked) {
      return Object.freeze({
        status: 'BLOCKED',
        reason: 'System in WELLBEING_BLOCKED',
      });
    }
    return null;
  },
};
