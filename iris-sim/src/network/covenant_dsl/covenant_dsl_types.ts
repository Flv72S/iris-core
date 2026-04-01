/**
 * Microstep 14N — Covenant DSL / Config Layer. Types.
 */

export interface CovenantDefinition {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly enabled: boolean;
  readonly severity: CovenantDSLSeverity;
  readonly condition: string;
}

/** JSON/config severity; normalized to CovenantSeverity in compiler. */
export type CovenantDSLSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/** Result of safe parsing; consumed by evaluator. */
export type ParsedExpression = readonly unknown[];
