import type { ExecutionAction } from '../ExecutionAction';
import type { ExecutionContext } from '../ExecutionContext';
import type { ExecutionResult } from '../ExecutionResult';
import type { ExecutionGuardrail } from './ExecutionGuardrail';

const MAX_ACTIONS = 3;
const WINDOW_MS = 10 * 60 * 1000;

export const maxActionsPerWindowGuardrail: ExecutionGuardrail = {
  id: 'max-actions-per-window',
  check(action: ExecutionAction, context: ExecutionContext): ExecutionResult | null {
    const recent = context.getRecentEntries();
    const since = context.now - WINDOW_MS;
    const inWindow = recent.filter((e) => e.requestedAt >= since);
    if (inWindow.length >= MAX_ACTIONS) {
      return Object.freeze({
        status: 'BLOCKED',
        reason: `Max ${MAX_ACTIONS} actions per ${WINDOW_MS / 60000} min reached`,
      });
    }
    return null;
  },
};
