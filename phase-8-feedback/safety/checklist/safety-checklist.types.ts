export type SafetyCheckId =
  | 'NO_SIGNAL_LAYER_WRITE'
  | 'NO_PREFERENCE_MUTATION'
  | 'NO_IMPLICIT_LEARNING'
  | 'DETERMINISTIC_OUTPUT'
  | 'REPLAY_SAFE'
  | 'STATE_ISOLATED'
  | 'PHASE_7_BOUNDARY_PRESERVED';

export interface SafetyCheckResult {
  readonly checkId: SafetyCheckId;
  readonly passed: boolean;
  readonly details?: string;
}

export interface SafetyChecklistResult {
  readonly checklistVersion: string;
  readonly timestamp: string;
  readonly results: readonly SafetyCheckResult[];
  readonly fullySafe: boolean;
}

export interface Phase7BoundaryReport {
  readonly signalLayerIsolation: boolean;
  readonly preferenceImmutability: boolean;
  readonly learningInactive: boolean;
  readonly phase7FullyCertified: boolean;
}

export interface Phase8ExecutionMetadata {
  readonly deterministicOutput: boolean;
  readonly stateMutations: number;
}

export interface ReplayResult {
  readonly success: boolean;
  readonly deterministicMatch: boolean;
}

/**
 * Phase 8.2.3 — Safety Checklist Aggregation & Verdict (immutable)
 */
export type SafetyChecklistStatus = 'SAFE' | 'WARNING' | 'UNSAFE';

export interface SafetyChecklistVerdict {
  readonly status: SafetyChecklistStatus;
  readonly violatedRules: readonly string[];
  readonly hasCriticalFailure: boolean;
  readonly explanation: string;
}
