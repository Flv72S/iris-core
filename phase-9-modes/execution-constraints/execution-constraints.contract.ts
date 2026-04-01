import type { BehaviorMode } from '../definition/mode.types';
import type { ExecutionConstraints } from './execution-constraints.types';

export const MODE_EXECUTION_CONSTRAINTS: Record<BehaviorMode, Omit<ExecutionConstraints, 'metadata'>> = Object.freeze({
  DEFAULT: Object.freeze({
    maxActions: 'UNLIMITED',
    allowParallelActions: true,
    interruptionTolerance: 'MEDIUM',
    proactiveActionAllowed: true,
  }),
  FOCUS: Object.freeze({
    maxActions: 1,
    allowParallelActions: false,
    interruptionTolerance: 'LOW',
    proactiveActionAllowed: false,
  }),
  WELLBEING: Object.freeze({
    maxActions: 0,
    allowParallelActions: false,
    interruptionTolerance: 'HIGH',
    proactiveActionAllowed: false,
  }),
});
