/**
 * Cooldown per Feature — stessa feature non può eseguire due volte in X minuti.
 */

import type { ExecutionAction } from '../ExecutionAction';
import type { ExecutionContext } from '../ExecutionContext';
import type { ExecutionResult } from '../ExecutionResult';
import type { ExecutionGuardrail } from './ExecutionGuardrail';

const COOLDOWN_MS = 5 * 60 * 1000;

export const cooldownPerFeatureGuardrail: ExecutionGuardrail = {
  id: 'cooldown-per-feature',
  check(action: ExecutionAction, context: ExecutionContext): ExecutionResult | null {
    const recent = context.getRecentEntries();
    const since = context.now - COOLDOWN_MS;
    const sameFeature = recent.filter(
      (e) => e.sourceFeature === action.sourceFeature && e.requestedAt >= since
    );
    const executed = sameFeature.filter((e) => e.result.status === 'EXECUTED');
    if (executed.length > 0) {
      return Object.freeze({
        status: 'SKIPPED',
        reason: `Cooldown: ${action.sourceFeature} already executed in last ${COOLDOWN_MS / 60000} min`,
      });
    }
    return null;
  },
};
