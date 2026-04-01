import type { BehaviorMode } from '../definition/mode.types';

export interface ExecutionConstraints {
  readonly maxActions: number | 'UNLIMITED';
  readonly allowParallelActions: boolean;
  readonly interruptionTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly proactiveActionAllowed: boolean;
  readonly metadata: { readonly derivedFromMode: BehaviorMode };
}
