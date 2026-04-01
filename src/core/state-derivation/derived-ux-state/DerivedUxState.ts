import type { UxStateType, UxSeverity, SemanticSignalId } from './types';

export interface DerivedUxState {
  readonly type: UxStateType;
  readonly severity: UxSeverity;
  readonly confidence: number;
  readonly derivedFrom: readonly SemanticSignalId[];
}
