/**
 * InboxAdapter — Stub per BLOCK_INPUT / DEFER_MESSAGE. Log-only.
 */

import type { ExecutionAction } from '../ExecutionAction';
import type { ExecutionResult } from '../ExecutionResult';
import type { ExecutionAdapter } from './ExecutionAdapter';

export const blockInputAdapter: ExecutionAdapter = {
  actionType: 'BLOCK_INPUT',
  execute(action: ExecutionAction, now: number): ExecutionResult {
    return Object.freeze({ status: 'EXECUTED', executedAt: now });
  },
};

export const deferMessageAdapter: ExecutionAdapter = {
  actionType: 'DEFER_MESSAGE',
  execute(action: ExecutionAction, now: number): ExecutionResult {
    return Object.freeze({ status: 'EXECUTED', executedAt: now });
  },
};
