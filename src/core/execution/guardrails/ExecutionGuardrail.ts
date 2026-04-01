import type { ExecutionAction } from '../ExecutionAction';
import type { ExecutionContext } from '../ExecutionContext';
import type { ExecutionResult } from '../ExecutionResult';

export interface ExecutionGuardrail {
  readonly id: string;
  readonly check: (
    action: ExecutionAction,
    context: ExecutionContext
  ) => ExecutionResult | null;
}
