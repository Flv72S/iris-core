/**
 * Microstep 14G — State Integrity Verification. Types.
 */

export interface StateIntegrityReport {
  readonly state_hash: string;
  readonly valid: boolean;
  readonly violations: IntegrityViolation[];
  readonly checked_at: number;
}

export interface IntegrityViolation {
  readonly type: IntegrityViolationType;
  readonly description: string;
  readonly related_id?: string | undefined;
}

export enum IntegrityViolationType {
  MISSING_CONSENSUS = 'MISSING_CONSENSUS',
  STATE_MISMATCH = 'STATE_MISMATCH',
  INVALID_TRANSITION = 'INVALID_TRANSITION',
  INCOMPLETE_TRACE = 'INCOMPLETE_TRACE',
  FORK_DETECTED = 'FORK_DETECTED',
}

