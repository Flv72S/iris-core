/**
 * Microstep 14L — AI Covenant Monitoring Platform. Types.
 */

import type { CovenantContext } from './covenant_context.js';

export enum CovenantSeverity {
  LOW,
  MEDIUM,
  HIGH,
  CRITICAL,
}

export interface CovenantViolation {
  readonly type: string;
  readonly message: string;
  readonly severity: CovenantSeverity;
}

export interface CovenantResult {
  readonly covenant_id: string;
  readonly valid: boolean;
  readonly violations: readonly CovenantViolation[];
}

export interface Covenant {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  validate(context: CovenantContext): CovenantResult;
}

export interface CovenantEvaluationReport {
  readonly valid: boolean;
  readonly results: readonly CovenantResult[];
  readonly violations: readonly CovenantViolation[];
  readonly evaluated_at: number;
}
