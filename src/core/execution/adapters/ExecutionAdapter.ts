/**
 * ExecutionAdapter — Stub: log-only, payload validato ma non usato.
 */

import type { ExecutionAction } from '../ExecutionAction';
import type { ExecutionResult } from '../ExecutionResult';

export interface ExecutionAdapter {
  readonly actionType: ExecutionAction['type'];
  execute(action: ExecutionAction, now: number): ExecutionResult;
}
