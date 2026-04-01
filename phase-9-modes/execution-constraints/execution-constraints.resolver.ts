import type { BehaviorMode } from '../definition/mode.types';
import type { ExecutionConstraints } from './execution-constraints.types';
import { MODE_EXECUTION_CONSTRAINTS } from './execution-constraints.contract';

export function resolveExecutionConstraints(mode: BehaviorMode): ExecutionConstraints {
  const base = MODE_EXECUTION_CONSTRAINTS[mode];
  const metadata = Object.freeze({ derivedFromMode: mode });
  return Object.freeze({ ...base, metadata });
}
